"""AI-powered clause risk annotation service.

Uses the Anthropic Claude API to enrich regex-detected clauses with
nuanced risk levels, plain-English explanations, and translation confidence
scores. Runs as a second AI pass after initial clause detection, covering
all document types.
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

# Fallback confidence score used when AI returns an out-of-range or missing value.
# Matches the "high" heuristic bucket in _estimate_confidence.
_DEFAULT_CONFIDENCE_SCORE = 92

# Archaic / jurisdiction-specific German patterns that lower translation confidence.
# Abs and Nr are intentionally case-sensitive: both are capitalised abbreviations
# in German legal text (Absatz, Nummer) and lowercase occurrences are not legal usage.
_ARCHAIC_PATTERNS = [
    re.compile(r"§\s*\d+", re.IGNORECASE),
    re.compile(r"\bAbs\b"),
    re.compile(r"\bNr\b"),
    re.compile(r"\bgemäß\b", re.IGNORECASE),
    re.compile(r"\bvorbehalten\b", re.IGNORECASE),
    re.compile(r"\bdergestalt\b", re.IGNORECASE),
    re.compile(r"\bhiermit\b", re.IGNORECASE),
    re.compile(r"\binsoweit\b", re.IGNORECASE),
    re.compile(r"\bvorbehaltlich\b", re.IGNORECASE),
    re.compile(r"\bdingliche\b", re.IGNORECASE),
    re.compile(r"\bReallast\b", re.IGNORECASE),
    re.compile(r"\bGrundschuld\b", re.IGNORECASE),
]

_SYSTEM_PROMPT = """You are a German real estate legal expert reviewing detected contract clauses.
For each clause, assess the risk to a property buyer, explain it in plain English, and score
translation confidence.

Return a JSON array with exactly one object per clause, in the same order as the input:
[{
  "risk_level": "high"|"medium"|"low",
  "risk_reason": "1-2 sentence plain English explanation",
  "confidence_level": "high"|"medium"|"low",
  "confidence_score": 0-100
}]

Risk level guidelines:
- "high": Unusual penalty clauses (Vertragsstrafe), non-standard upfront payments, rights-of-first-refusal for third parties, maintenance liability shifted to buyer, clauses deviating from BGB defaults, Sonderumlage or WEG capital reserve deficits, full warranty exclusions
- "medium": Financial obligations, tight deadlines, special conditions requiring buyer attention
- "low": Standard boilerplate typical in German real estate contracts

Confidence level guidelines (how accurately the English translation captures the German meaning):
- "high" (85-100): Clear standard German legal language; translation is unambiguous
- "medium" (60-84): Some technical jargon or compound terms that may lose nuance in translation
- "low" (0-59): Archaic German, highly jurisdiction-specific terms (§ BGB references), complex compound sentences, or mixed-language content — professional review strongly recommended

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


def _estimate_confidence(clause: dict) -> tuple[str, int]:
    """Rule-based confidence estimation used when the AI call is unavailable.

    Counts archaic/technical German patterns and sentence length as proxies
    for translation difficulty. Scores are coarse three-bucket values (92/72/50)
    rather than a continuous scale — precision is not warranted given the
    heuristic nature of the estimation.

    Returns:
        Tuple of (confidence_level, confidence_score).
    """
    text = clause.get("original_text", "")
    archaic_count = sum(1 for p in _ARCHAIC_PATTERNS if p.search(text))
    word_count = len(text.split())

    if archaic_count >= 2 or word_count > 50:
        return "low", 50
    if archaic_count == 1 or word_count > 25:
        return "medium", 72
    return "high", _DEFAULT_CONFIDENCE_SCORE


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
        system=_SYSTEM_PROMPT,
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
        if item.get("confidence_level") not in valid_levels:
            item["confidence_level"] = "high"
        raw_score = item.get("confidence_score")
        if not isinstance(raw_score, int) or not (0 <= raw_score <= 100):
            item["confidence_score"] = _DEFAULT_CONFIDENCE_SCORE

    return data


async def analyze_clause_risks(clauses: list[dict]) -> list[dict]:
    """Enrich detected clauses with AI-powered risk levels, explanations, and confidence.

    Takes the regex-detected clause list and returns a copy where each item
    has an updated ``risk_level``, a new ``risk_reason`` field, and
    ``confidence_level`` / ``confidence_score`` fields indicating how
    accurately the English translation captures the original German meaning.

    Falls back gracefully to rule-based confidence heuristics if the AI call
    is unavailable or fails.

    Args:
        clauses: List of clause dicts (from regex detection). Each must have
            at minimum ``clause_type``, ``original_text``, ``page_number``,
            and ``risk_level`` keys.

    Returns:
        Enhanced clause list. Original list returned with heuristic confidence
        on error.
    """
    if not clauses:
        return clauses

    client = _get_anthropic_client()
    if client is None:
        logger.info("Anthropic not configured — using heuristic clause confidence")
        return _add_defaults(clauses)

    # Process up to _MAX_CLAUSES; keep the rest unchanged
    batch = clauses[:_MAX_CLAUSES]
    remainder = clauses[_MAX_CLAUSES:]

    clauses_text = _build_clauses_text(batch)

    try:
        raw = await asyncio.to_thread(_call_claude, client, clauses_text)
        annotations = _parse_risk_response(raw, len(batch))
    except Exception:
        logger.exception("Clause risk AI analysis failed")
        return _add_defaults(clauses)

    if annotations is None:
        return _add_defaults(clauses)

    enriched: list[dict] = []
    for i, clause in enumerate(batch):
        if i < len(annotations):
            annotation = annotations[i]
            conf_level, conf_score = _estimate_confidence(clause)
            enriched.append(
                {
                    **clause,
                    "risk_level": annotation.get("risk_level", clause["risk_level"]),
                    "risk_reason": annotation.get("risk_reason", ""),
                    "confidence_level": annotation.get("confidence_level", conf_level),
                    "confidence_score": annotation.get("confidence_score", conf_score),
                }
            )
        else:
            conf_level, conf_score = _estimate_confidence(clause)
            enriched.append(
                {
                    **clause,
                    "risk_reason": "",
                    "confidence_level": conf_level,
                    "confidence_score": conf_score,
                }
            )

    # Remainder clauses were not submitted to the AI; preserve any pre-existing
    # risk_reason and apply heuristic confidence estimation.
    for clause in remainder:
        conf_level, conf_score = _estimate_confidence(clause)
        enriched.append(
            {
                **clause,
                "risk_reason": clause.get("risk_reason", ""),
                "confidence_level": conf_level,
                "confidence_score": conf_score,
            }
        )

    return enriched


def _add_defaults(clauses: list[dict]) -> list[dict]:
    """Return clauses with risk_reason defaulted and confidence estimated via heuristics."""
    result = []
    for c in clauses:
        conf_level, conf_score = _estimate_confidence(c)
        result.append(
            {
                **c,
                "risk_reason": c.get("risk_reason", ""),
                "confidence_level": c.get("confidence_level", conf_level),
                "confidence_score": c.get("confidence_score", conf_score),
            }
        )
    return result
