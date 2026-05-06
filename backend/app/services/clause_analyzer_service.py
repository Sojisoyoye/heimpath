"""AI-powered Kaufvertrag clause analysis service.

Uses the Anthropic Claude API to analyze German purchase contracts
clause-by-clause, producing risk ratings, plain-English explanations,
and a notary checklist.
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

SYSTEM_PROMPT = """You are a German real estate legal expert helping foreign buyers understand a Kaufvertrag (purchase contract). Analyze the contract text and return a JSON object with:

1. **summary**: A 2-3 sentence plain-English overview of the contract.
2. **analyzed_clauses**: An array of clause objects for each major section found. Standard Kaufvertrag sections include (but are not limited to): Kaufgegenstand (Subject of Sale), Kaufpreis (Purchase Price), Zahlung (Payment Terms), Gewährleistung (Warranty/Liability), Übergabe (Handover), Grundbuch (Land Registry), Finanzierungsvollmacht (Financing Power of Attorney), Rücktrittsrecht (Right of Withdrawal), Auflassung (Conveyance), Erschließungskosten (Development Costs), Besondere Vereinbarungen (Special Agreements). Each clause object must have:
   - "section_name": German section title as found in the contract
   - "section_name_en": English translation of the section title
   - "original_text": The original German text (first 500 chars if longer)
   - "plain_english_explanation": Clear explanation for a non-lawyer
   - "risk_level": "high" (warranty exclusions, penalty clauses, tight deadlines, unusual obligations), "medium" (standard important clauses needing attention), or "low" (standard boilerplate)
   - "risk_reason": Why this risk level was assigned
   - "is_unusual": true if the clause contains non-standard or unusual terms
   - "unusual_terms": array of specific unusual terms found (empty array if none)
   - "page_number": page number where the clause appears (from PAGE markers), or null
3. **notary_checklist**: Array of questions to ask the notary, each with:
   - "question": The question in plain English
   - "related_clause": Which contract section it relates to
   - "priority": "essential" (must ask), "recommended" (should ask), or "optional" (nice to know)
4. **overall_risk_assessment**: "low", "medium", or "high"
5. **overall_risk_explanation**: 1-2 sentence explanation of the overall risk level.
6. **purchase_price_euros**: The purchase price as a plain number in euros (digits only, no currency symbols, no thousands separators). Extract this from the Kaufpreis section. Return null if not clearly stated.

Return ONLY valid JSON. No markdown, no explanation outside the JSON."""


def _get_anthropic_client() -> anthropic.Anthropic | None:
    """Get a lazily-initialized Anthropic client. Returns None if not configured."""
    global _client  # noqa: PLW0603
    if _client is not None:
        return _client
    if not settings.anthropic_enabled:
        return None
    import anthropic as anthropic_mod

    _client = anthropic_mod.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def _build_contract_text(pages: list[dict]) -> str:
    """Join page texts with page markers for the AI to reference."""
    parts = []
    for page in pages:
        text = page.get("original_text", "").strip()
        if text:
            parts.append(f"--- PAGE {page['page_number']} ---\n{text}")
    return "\n\n".join(parts)


def _call_claude(client: anthropic.Anthropic, contract_text: str) -> str:
    """Make a synchronous API call to Claude for contract analysis."""
    message = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=settings.ANTHROPIC_MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Analyze this German Kaufvertrag:\n\n{contract_text}",
            }
        ],
    )
    if not message.content:
        raise ValueError("Empty response from Anthropic API")
    return message.content[0].text


def _parse_analysis_response(text: str) -> dict | None:
    """Parse Claude's JSON response, handling optional markdown code blocks."""
    # Strip markdown code fences if present
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", text.strip())
    cleaned = re.sub(r"\n?```\s*$", "", cleaned)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse clause analysis JSON: %s", text[:200])
        return None

    # Validate required top-level keys
    required_keys = {
        "summary",
        "analyzed_clauses",
        "notary_checklist",
        "overall_risk_assessment",
        "overall_risk_explanation",
    }
    if not required_keys.issubset(data.keys()):
        missing = required_keys - data.keys()
        logger.error("Clause analysis missing keys: %s", missing)
        return None

    # Add AI attribution flag
    data["is_ai_generated"] = True
    return data


async def analyze_kaufvertrag(pages: list[dict], document_type: str) -> dict | None:
    """Analyze a Kaufvertrag using Claude AI.

    Args:
        pages: List of page dicts with 'page_number' and 'original_text'.
        document_type: The document type string.

    Returns:
        Analysis dict matching KaufvertragAnalysis schema, or None if
        analysis is unavailable (wrong doc type, missing API key, or error).
    """
    if document_type != "kaufvertrag":
        return None

    client = _get_anthropic_client()
    if client is None:
        logger.info("Anthropic not configured — skipping Kaufvertrag analysis")
        return None

    contract_text = _build_contract_text(pages)
    if not contract_text.strip():
        logger.warning("No text extracted from Kaufvertrag — skipping analysis")
        return None

    try:
        raw_response = await asyncio.to_thread(_call_claude, client, contract_text)
        return _parse_analysis_response(raw_response)
    except Exception:
        logger.exception("Kaufvertrag AI analysis failed")
        return None
