"""Glossary term linking service for translated documents.

Scans the original German text of translated document pages for known
HeimPath glossary terms. Returns a structured list of matched terms with
their page numbers so the frontend can render inline tooltips.

Also logs capitalised German-looking nouns that are absent from the
glossary into the ``glossary_gap`` table so editors can identify missing
terminology.
"""

from __future__ import annotations

import logging
import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.glossary import GlossaryTerm
from app.models.glossary_gap import GlossaryGap

logger = logging.getLogger(__name__)

# Regex that identifies capitalised German nouns ending in common legal
# suffixes as candidates for the glossary gap table.
_LEGAL_TERM_PATTERN = re.compile(
    r"\b[A-ZÄÖÜ][a-zäöüß]+"
    r"(?:recht|vertrag|pflicht|gebühr|steuer|kosten|schein"
    r"|buch|amt|geld|schaft|ung|keit|heit|tum|erklärung)\b",
)


def _term_regex(term_de: str) -> re.Pattern[str]:
    """Return a compiled regex that matches *term_de* as a whole word."""
    escaped = re.escape(term_de)
    return re.compile(
        rf"(?<![a-zA-ZäöüÄÖÜß]){escaped}(?![a-zA-ZäöüÄÖÜß])",
        re.IGNORECASE,
    )


async def link_glossary_terms(
    session: AsyncSession,
    document_id: uuid.UUID,
    pages: list[dict],
) -> list[dict]:
    """Match glossary terms in document pages and log unmatched candidates.

    Scans the original German text of each page for known glossary entries.
    Terms are matched case-insensitively as whole words so that "Grundbuch"
    does not spuriously match inside "Grundbuchauszug" unless both terms are
    individually in the glossary.

    Args:
        session: Async database session.
        document_id: ID of the document being processed (for gap logging).
        pages: List of page dicts, each with ``page_number`` and
            ``original_text`` keys.

    Returns:
        List of dicts with keys ``term_de``, ``term_en``, ``slug``,
        ``definition_short``, and ``page_numbers``. Returns an empty list
        when no pages have text or no glossary terms are found.
    """
    if not pages:
        return []

    # Load all glossary terms once
    result = await session.execute(
        select(
            GlossaryTerm.term_de,
            GlossaryTerm.term_en,
            GlossaryTerm.slug,
            GlossaryTerm.definition_short,
        )
    )
    terms = result.all()

    if not terms:
        return []

    # Sort longest-first so "Grundbuchauszug" is matched before "Grundbuch"
    # when scanning for glossary content (though both will be found if both
    # exist in the glossary).
    sorted_terms = sorted(terms, key=lambda t: len(t.term_de), reverse=True)
    known_terms_lower = {t.term_de.lower() for t in sorted_terms}

    # Build compiled regex per term (cached in local list)
    term_regexes = [(t, _term_regex(t.term_de)) for t in sorted_terms]

    # Aggregate: slug → {meta, page_numbers set}
    found: dict[str, dict] = {}
    unmatched_candidates: set[str] = set()

    for page in pages:
        text = page.get("original_text", "")
        if not text:
            continue
        page_num: int = page.get("page_number", 0)

        for term, pattern in term_regexes:
            if pattern.search(text):
                if term.slug not in found:
                    found[term.slug] = {
                        "term_de": term.term_de,
                        "term_en": term.term_en,
                        "slug": term.slug,
                        "definition_short": term.definition_short,
                        "page_numbers": [],
                    }
                if page_num not in found[term.slug]["page_numbers"]:
                    found[term.slug]["page_numbers"].append(page_num)

        # Collect legal-looking words absent from the glossary
        for match in _LEGAL_TERM_PATTERN.finditer(text):
            candidate = match.group(0)
            if candidate.lower() not in known_terms_lower:
                unmatched_candidates.add(candidate)

    if unmatched_candidates:
        await _log_glossary_gaps(session, document_id, unmatched_candidates)

    return list(found.values())


async def _log_glossary_gaps(
    session: AsyncSession,
    document_id: uuid.UUID,
    candidates: set[str],
) -> None:
    """Upsert unmatched legal terms into the glossary_gap table."""
    for term in candidates:
        try:
            result = await session.execute(
                select(GlossaryGap).where(GlossaryGap.term_de == term)
            )
            existing = result.scalar_one_or_none()
            if existing is not None:
                existing.occurrence_count = existing.occurrence_count + 1
            else:
                session.add(
                    GlossaryGap(
                        term_de=term,
                        first_seen_document_id=document_id,
                    )
                )
        except Exception:
            logger.exception("Failed to log glossary gap for term %r", term)
