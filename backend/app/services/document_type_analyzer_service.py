"""AI-powered document type analysis service.

Uses the Anthropic Claude API to analyse German real estate documents by type,
producing structured JSON extractions for Grundbuchauszug, Teilungserklärung,
Mietvertrag, and Wohnungsgrundriss documents.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    import anthropic

logger = logging.getLogger(__name__)

_client: anthropic.Anthropic | None = None

SUPPORTED_TYPES = {
    "grundbuchauszug",
    "teilungserklaerung",
    "mietvertrag",
    "wohnungsgrundriss",
}

_SYSTEM_PROMPTS: dict[str, str] = {
    "grundbuchauszug": """You are a German land registry expert helping foreign buyers understand a Grundbuchauszug (land registry extract). Analyse the document and return a JSON object with:

- "property_description": A plain-English description of the property from the Bestandsverzeichnis.
- "abteilung1": { "owners": [ { "name": str, "share": str, "acquisition_date": str|null } ] }
- "abteilung2": { "encumbrances": [ { "type": str, "beneficiary": str, "description": str } ] }
- "abteilung3": { "charges": [ { "type": str, "creditor": str, "amount_eur": number|null } ] }
- "risk_flags": [ { "flag": str, "description": str, "risk_level": "low"|"medium"|"high" } ]
- "is_ai_generated": true

Return ONLY valid JSON. No markdown, no explanation outside the JSON.""",
    "teilungserklaerung": """You are a German WEG (Wohnungseigentumsgesetz) law expert helping foreign buyers understand a Teilungserklärung (declaration of division). Analyse the document and return a JSON object with:

- "unit_description": Plain-English description of the unit.
- "miteigentumsanteil": The fractional co-ownership share as a string (e.g. "150/1000").
- "sondereigentum": [ { "area": str, "description": str } ]
- "sondernutzungsrechte": [ { "description": str, "conditions": str } ]
- "gemeinschaftseigentum": [ str ]
- "weg_rules": [ { "rule": str, "impact": str } ]
- "risk_flags": [ { "flag": str, "description": str, "risk_level": "low"|"medium"|"high" } ]
- "is_ai_generated": true

Return ONLY valid JSON. No markdown, no explanation outside the JSON.""",
    "mietvertrag": """You are a German tenancy law expert helping foreign tenants understand a Mietvertrag (rental agreement). Analyse the document and return a JSON object with:

- "monthly_rent_eur": number|null
- "deposit_eur": number|null
- "notice_period_months": number|null
- "lease_start": str|null (ISO date)
- "lease_end": str|null (ISO date)
- "is_unlimited": bool
- "maintenance_obligations": [ { "party": "landlord"|"tenant", "obligation": str } ]
- "renewal_clauses": [ { "clause": str, "conditions": str } ]
- "special_agreements": [ str ]
- "risk_flags": [ { "flag": str, "description": str, "risk_level": "low"|"medium"|"high" } ]
- "is_ai_generated": true

Return ONLY valid JSON. No markdown, no explanation outside the JSON.""",
    "wohnungsgrundriss": """You are a German property expert helping foreign buyers understand a Wohnungsgrundriss (apartment floor plan). Extract room information and return a JSON object with:

- "rooms": [ { "name_de": str, "name_en": str, "area_sqm": number|null } ]
- "total_area_sqm": number|null
- "floor": str|null
- "features": [ str ]  (e.g. balcony, storage room, parking)
- "notes": [ str ]
- "is_ai_generated": true

Return ONLY valid JSON. No markdown, no explanation outside the JSON.""",
}

_REQUIRED_KEYS: dict[str, set[str]] = {
    "grundbuchauszug": {
        "property_description",
        "abteilung1",
        "abteilung2",
        "abteilung3",
    },
    "teilungserklaerung": {
        "miteigentumsanteil",
        "sondereigentum",
        "gemeinschaftseigentum",
    },
    "mietvertrag": {"monthly_rent_eur", "is_unlimited", "risk_flags"},
    "wohnungsgrundriss": {"rooms"},
}


def _get_anthropic_client() -> anthropic.Anthropic | None:
    """Get a lazily-initialised Anthropic client. Returns None if not configured."""
    global _client  # noqa: PLW0603
    if _client is not None:
        return _client
    if not settings.anthropic_enabled:
        return None
    import anthropic as anthropic_mod

    _client = anthropic_mod.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def _build_document_text(pages: list[dict]) -> str:
    """Join page texts with page markers for the AI to reference."""
    parts = []
    for page in pages:
        text = page.get("original_text", "").strip()
        if text:
            parts.append(f"--- PAGE {page['page_number']} ---\n{text}")
    return "\n\n".join(parts)


def _call_claude(client: anthropic.Anthropic, document_type: str, text: str) -> str:
    """Make a synchronous API call to Claude for document type analysis."""
    message = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=settings.ANTHROPIC_MAX_TOKENS,
        system=_SYSTEM_PROMPTS[document_type],
        messages=[
            {
                "role": "user",
                "content": f"Analyse this German document:\n\n{text}",
            }
        ],
    )
    if not message.content:
        raise ValueError("Empty response from Anthropic API")
    return message.content[0].text


def _parse_response(text: str, required_keys: set[str]) -> dict | None:
    """Parse Claude's JSON response, handling optional markdown code fences."""
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", text.strip())
    cleaned = re.sub(r"\n?```\s*$", "", cleaned)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse document type analysis JSON: %s", text[:200])
        return None

    if not required_keys.issubset(data.keys()):
        missing = required_keys - data.keys()
        logger.error("Document type analysis missing keys: %s", missing)
        return None

    data["is_ai_generated"] = True
    return data


async def analyze_document_type(pages: list[dict], document_type: str) -> dict | None:
    """Analyse a document using Claude AI based on its type.

    Args:
        pages: List of page dicts with 'page_number' and 'original_text'.
        document_type: The document type string (must be in SUPPORTED_TYPES).

    Returns:
        Analysis dict, or None if analysis is unavailable (unsupported type,
        missing API key, empty text, or error).
    """
    if document_type not in SUPPORTED_TYPES:
        return None

    client = _get_anthropic_client()
    if client is None:
        logger.info(
            "Anthropic not configured — skipping document type analysis for %s",
            document_type,
        )
        return None

    text = _build_document_text(pages)
    if not text.strip():
        logger.warning("No text extracted from %s — skipping analysis", document_type)
        return None

    try:
        raw = await asyncio.to_thread(_call_claude, client, document_type, text)
        return _parse_response(raw, _REQUIRED_KEYS[document_type])
    except Exception:
        logger.exception("Document type analysis failed for %s", document_type)
        return None
