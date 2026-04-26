"""Tests for glossary term linking service."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.glossary_linker_service import (
    _LEGAL_TERM_PATTERN,
    _term_regex,
    link_glossary_terms,
)

# --- Sample data ---

_DOC_ID = uuid.UUID("12345678-1234-5678-1234-567812345678")


def _make_term(term_de: str, term_en: str, slug: str, definition: str) -> MagicMock:
    """Build a mock GlossaryTerm row-like object."""
    t = MagicMock()
    t.term_de = term_de
    t.term_en = term_en
    t.slug = slug
    t.definition_short = definition
    return t


SAMPLE_TERMS = [
    _make_term("Grundbuch", "Land Registry", "grundbuch", "Official property register."),
    _make_term(
        "Kaufvertrag",
        "Purchase Agreement",
        "kaufvertrag",
        "Notarised sale contract.",
    ),
    _make_term(
        "Grundbuchauszug",
        "Land Registry Extract",
        "grundbuchauszug",
        "Official extract from land register.",
    ),
]

SAMPLE_PAGES = [
    {
        "page_number": 1,
        "original_text": "Dieser Kaufvertrag regelt den Eigentumsübergang.",
        "translated_text": "This purchase agreement governs the transfer of ownership.",
    },
    {
        "page_number": 2,
        "original_text": "Ein Grundbuchauszug liegt vor.",
        "translated_text": "A land registry extract is available.",
    },
    {
        "page_number": 3,
        "original_text": "",
        "translated_text": "",
    },
]


def _make_session(terms: list) -> AsyncMock:
    """Build a mock AsyncSession that returns terms from execute()."""
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.all.return_value = terms
    session.execute.return_value = mock_result
    return session


# --- _term_regex ---


class TestTermRegex:
    def test_matches_exact_term(self) -> None:
        pattern = _term_regex("Grundbuch")
        assert pattern.search("Der Grundbuch ist aktuell.")

    def test_does_not_match_inside_longer_word(self) -> None:
        pattern = _term_regex("Grundbuch")
        # "Grundbuchauszug" contains "Grundbuch" — should NOT match as whole word
        assert pattern.search("Grundbuchauszug") is None

    def test_case_insensitive(self) -> None:
        pattern = _term_regex("Kaufvertrag")
        assert pattern.search("der kaufvertrag")

    def test_matches_at_start(self) -> None:
        pattern = _term_regex("Kaufvertrag")
        assert pattern.search("Kaufvertrag ist gültig.")

    def test_matches_at_end(self) -> None:
        pattern = _term_regex("Notar")
        assert pattern.search("Beim Notar")


# --- _LEGAL_TERM_PATTERN ---


class TestLegalTermPattern:
    def test_matches_known_suffix_words(self) -> None:
        text = "Das Mietrecht und der Kaufvertrag sind relevant."
        matches = {m.group(0) for m in _LEGAL_TERM_PATTERN.finditer(text)}
        assert "Mietrecht" in matches
        assert "Kaufvertrag" in matches

    def test_does_not_match_lowercase(self) -> None:
        matches = list(_LEGAL_TERM_PATTERN.finditer("das mietrecht"))
        assert len(matches) == 0


# --- link_glossary_terms ---


class TestLinkGlossaryTerms:
    @pytest.mark.asyncio
    async def test_returns_empty_for_no_pages(self) -> None:
        session = _make_session(SAMPLE_TERMS)
        result = await link_glossary_terms(session, _DOC_ID, [])
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_when_no_glossary_terms(self) -> None:
        session = _make_session([])
        result = await link_glossary_terms(session, _DOC_ID, SAMPLE_PAGES)
        assert result == []

    @pytest.mark.asyncio
    async def test_finds_kaufvertrag_on_page_1(self) -> None:
        session = _make_session(SAMPLE_TERMS)
        result = await link_glossary_terms(session, _DOC_ID, SAMPLE_PAGES)

        slugs = {r["slug"] for r in result}
        assert "kaufvertrag" in slugs

    @pytest.mark.asyncio
    async def test_finds_grundbuchauszug_not_grundbuch_on_page_2(self) -> None:
        # "Grundbuchauszug" is in the text — "Grundbuch" should NOT match inside it
        session = _make_session(SAMPLE_TERMS)
        result = await link_glossary_terms(session, _DOC_ID, SAMPLE_PAGES)

        slugs = {r["slug"] for r in result}
        assert "grundbuchauszug" in slugs
        assert "grundbuch" not in slugs

    @pytest.mark.asyncio
    async def test_includes_correct_page_numbers(self) -> None:
        session = _make_session(SAMPLE_TERMS)
        result = await link_glossary_terms(session, _DOC_ID, SAMPLE_PAGES)

        kv = next(r for r in result if r["slug"] == "kaufvertrag")
        assert 1 in kv["page_numbers"]

    @pytest.mark.asyncio
    async def test_term_on_multiple_pages(self) -> None:
        pages = [
            {"page_number": 1, "original_text": "Der Kaufvertrag"},
            {"page_number": 2, "original_text": "Kaufvertrag gilt weiterhin."},
        ]
        session = _make_session(SAMPLE_TERMS)
        result = await link_glossary_terms(session, _DOC_ID, pages)

        kv = next(r for r in result if r["slug"] == "kaufvertrag")
        assert 1 in kv["page_numbers"]
        assert 2 in kv["page_numbers"]

    @pytest.mark.asyncio
    async def test_skips_empty_pages(self) -> None:
        # Only page 3 which has empty text — should find no terms
        empty_pages = [{"page_number": 3, "original_text": ""}]
        session = _make_session(SAMPLE_TERMS)
        result = await link_glossary_terms(session, _DOC_ID, empty_pages)
        assert result == []

    @pytest.mark.asyncio
    async def test_result_includes_required_fields(self) -> None:
        session = _make_session(SAMPLE_TERMS)
        result = await link_glossary_terms(session, _DOC_ID, SAMPLE_PAGES)

        assert len(result) > 0
        for link in result:
            assert "term_de" in link
            assert "term_en" in link
            assert "slug" in link
            assert "definition_short" in link
            assert "page_numbers" in link
            assert isinstance(link["page_numbers"], list)

    @pytest.mark.asyncio
    async def test_logs_unmatched_legal_terms_to_gap_table(self) -> None:
        # "Mietrecht" ends in "recht" and is not in SAMPLE_TERMS
        pages = [{"page_number": 1, "original_text": "Das Mietrecht ist wichtig."}]
        session = _make_session(SAMPLE_TERMS)
        # Gap table check: execute is called for glossary terms AND gap upserts
        with patch(
            "app.services.glossary_linker_service._log_glossary_gaps",
            new_callable=AsyncMock,
        ) as mock_log:
            await link_glossary_terms(session, _DOC_ID, pages)
            mock_log.assert_called_once()
            # The candidates set should contain "Mietrecht"
            _, _, candidates = mock_log.call_args.args
            assert "Mietrecht" in candidates

    @pytest.mark.asyncio
    async def test_does_not_log_gap_for_known_glossary_term(self) -> None:
        # "Kaufvertrag" ends in "vertrag" but IS in SAMPLE_TERMS
        pages = [{"page_number": 1, "original_text": "Kaufvertrag regelt alles."}]
        session = _make_session(SAMPLE_TERMS)
        with patch(
            "app.services.glossary_linker_service._log_glossary_gaps",
            new_callable=AsyncMock,
        ) as mock_log:
            await link_glossary_terms(session, _DOC_ID, pages)
            # Either not called, or called with a set that does NOT contain "Kaufvertrag"
            if mock_log.called:
                _, _, candidates = mock_log.call_args.args
                assert "Kaufvertrag" not in candidates
