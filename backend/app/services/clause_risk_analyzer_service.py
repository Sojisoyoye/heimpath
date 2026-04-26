"""AI-powered clause risk annotation service.

Uses the Anthropic Claude API to enrich regex-detected clauses with
nuanced risk levels and plain-English explanations. Runs as a second AI
pass after initial clause detection, covering all document types.
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

# Maximum clauses to submit in a single AI call (cost/latency guard)
_MAX_CLAUSES = 20

SYSTEM_PROMPT = """You are a German real estate legal expert reviewing detected contract clauses.
For each clause, assess the risk to a property buyer and explain it in plain English.

Return a JSON array with exactly one object per clause, in the same order as the input:
[{"risk_level": "high"|"medium"|"low", "risk_reason": "1-2 sentence plain English explanation"}]

Risk level guidelines:
- "high": Unusual penalty clauses (Vertragsstrafe), non-standard upfront payments, rights-of-first-refusal for third parties, maintenance liability shifted to buyer, clauses deviating from BGB defaults, Sonderumlage or WEG capital reserve deficits, full warranty exclusions
- "medium": Financial obligations, tight deadlines, special conditions requiring buyer attention
- "low": Standard boilerplate typical in German real estate contracts

Be concise — risk_reason must be 1-2 sentences. Return ONLY a valid JSON array, no markdown."""


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


def _build_clauses_text(clauses: list[dict]) -> str:
    """Format clauses as a numbered list for the AI prompt."""
    parts = []
    for i, clause in enumerate(clauses, start=1):
        german = clause.get("original_text", "").strip()
        english = clause.get("translated_text", "").strip()
        clause_type = clause.get("clause_type", "unknown")
        page = clause.get("page_number", "?")
        entry = f"CLAUSE {i} (type: {clause_type}, page: {page})\nGerman: {german}"
        if english:
            entry += f"\nEnglish: {english}"
        parts.append(entry)
    return "\n\n".join(parts)


def _call_claude(client: anthropic.Anthropic, clauses_text: str) -> str:
    """Make a synchronous API call to Claude for clause risk annotation."""
    message = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=settings.ANTHROPIC_MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Assess the risk of these detected contract clauses:\n\n{clauses_text}",
            }
        ],
    )
    if not message.content:
        raise ValueError("Empty response from Anthropic API")
    return message.content[0].text


def _parse_risk_response(text: str, expected_count: int) -> list[dict] | None:
    """Parse Claude's JSON array response, handling optional markdown fences."""
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", text.strip())
    cleaned = re.sub(r"\n?```\s*$", "", cleaned)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse clause risk JSON: %s", text[:200])
        return None

    if not isinstance(data, list):
        logger.warning("Clause risk response is not a list")
        return None

    if len(data) != expected_count:
        logger.warning(
            "Clause risk response has %d items, expected %d",
            len(data),
            expected_count,
        )

    valid_levels = {"high", "medium", "low"}
    for item in data:
        if not isinstance(item, dict):
            return None
        if item.get("risk_level") not in valid_levels:
            item["risk_level"] = "medium"
        if not isinstance(item.get("risk_reason"), str):
            item["risk_reason"] = ""

    return data


async def analyze_clause_risks(clauses: list[dict]) -> list[dict]:
    """Enrich detected clauses with AI-powered risk levels and explanations.

    Takes the regex-detected clause list and returns a copy where each item
    has an updated ``risk_level`` and a new ``risk_reason`` field containing a
    plain-English explanation. Falls back gracefully to the original list if
    the AI call is unavailable or fails.

    Args:
        clauses: List of clause dicts (from regex detection). Each must have
            at minimum ``clause_type``, ``original_text``, ``page_number``,
            and ``risk_level`` keys.

    Returns:
        Enhanced clause list with ``risk_reason`` populated. Original list
        returned unchanged on error.
    """
    if not clauses:
        return clauses

    client = _get_anthropic_client()
    if client is None:
        logger.info("Anthropic not configured — skipping clause risk annotation")
        return _add_empty_risk_reason(clauses)

    # Process up to _MAX_CLAUSES; keep the rest unchanged
    batch = clauses[:_MAX_CLAUSES]
    remainder = clauses[_MAX_CLAUSES:]

    clauses_text = _build_clauses_text(batch)

    try:
        raw = await asyncio.to_thread(_call_claude, client, clauses_text)
        annotations = _parse_risk_response(raw, len(batch))
    except Exception:
        logger.exception("Clause risk AI analysis failed")
        return _add_empty_risk_reason(clauses)

    if annotations is None:
        return _add_empty_risk_reason(clauses)

    enriched: list[dict] = []
    for i, clause in enumerate(batch):
        if i < len(annotations):
            annotation = annotations[i]
            enriched.append(
                {
                    **clause,
                    "risk_level": annotation.get("risk_level", clause["risk_level"]),
                    "risk_reason": annotation.get("risk_reason", ""),
                }
            )
        else:
            enriched.append({**clause, "risk_reason": ""})

    for clause in remainder:
        enriched.append({**clause, "risk_reason": ""})

    return enriched


def _add_empty_risk_reason(clauses: list[dict]) -> list[dict]:
    """Return clauses unchanged but with risk_reason defaulted to empty string."""
    return [{**c, "risk_reason": c.get("risk_reason", "")} for c in clauses]
