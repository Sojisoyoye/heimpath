"""Tests for the Glossary Service."""

import uuid
from unittest.mock import MagicMock

import pytest

from app.models.glossary import GlossaryCategory, GlossaryTerm
from app.services.glossary_service import (
    GlossaryTermNotFoundError,
    get_categories,
    get_related_terms,
    get_term_by_slug,
    get_terms,
)


@pytest.fixture
def sample_term() -> MagicMock:
    """Create a sample glossary term mock."""
    term = MagicMock(spec=GlossaryTerm)
    term.id = uuid.uuid4()
    term.term_de = "Grunderwerbsteuer"
    term.term_en = "Real Estate Transfer Tax"
    term.slug = "grunderwerbsteuer"
    term.definition_short = "Tax paid when purchasing real estate in Germany."
    term.definition_long = "The Grunderwerbsteuer is a one-time tax..."
    term.category = GlossaryCategory.COSTS_TAXES.value
    term.example_usage = "When buying an apartment for €300,000..."
    term.related_terms = ["notarkosten", "grundsteuer"]
    return term


@pytest.fixture
def sample_term_2() -> MagicMock:
    """Create a second sample glossary term mock."""
    term = MagicMock(spec=GlossaryTerm)
    term.id = uuid.uuid4()
    term.term_de = "Kaufvertrag"
    term.term_en = "Purchase Agreement"
    term.slug = "kaufvertrag"
    term.definition_short = "The legally binding contract for property purchase."
    term.definition_long = "A Kaufvertrag is the formal purchase agreement..."
    term.category = GlossaryCategory.BUYING_PROCESS.value
    term.example_usage = None
    term.related_terms = ["notar", "grundbuch"]
    return term


class TestGetTerms:
    """Tests for getting glossary terms."""

    def test_returns_terms_with_count(self, sample_term: MagicMock) -> None:
        """Test that get_terms returns terms with total count."""
        mock_session = MagicMock()
        mock_exec_count = MagicMock()
        mock_exec_count.scalar.return_value = 1
        mock_exec_terms = MagicMock()
        mock_exec_terms.scalars.return_value.all.return_value = [sample_term]
        mock_session.exec.side_effect = [mock_exec_count, mock_exec_terms]

        terms, total = get_terms(mock_session, page=1, page_size=20)

        assert len(terms) == 1
        assert total == 1
        assert terms[0].term_de == "Grunderwerbsteuer"

    def test_returns_empty_list_when_no_terms(self) -> None:
        """Test that get_terms returns empty list when no terms exist."""
        mock_session = MagicMock()
        mock_exec_count = MagicMock()
        mock_exec_count.scalar.return_value = 0
        mock_exec_terms = MagicMock()
        mock_exec_terms.scalars.return_value.all.return_value = []
        mock_session.exec.side_effect = [mock_exec_count, mock_exec_terms]

        terms, total = get_terms(mock_session)

        assert len(terms) == 0
        assert total == 0

    def test_filters_by_category(self, sample_term: MagicMock) -> None:
        """Test that get_terms filters by category."""
        mock_session = MagicMock()
        mock_exec_count = MagicMock()
        mock_exec_count.scalar.return_value = 1
        mock_exec_terms = MagicMock()
        mock_exec_terms.scalars.return_value.all.return_value = [sample_term]
        mock_session.exec.side_effect = [mock_exec_count, mock_exec_terms]

        terms, total = get_terms(mock_session, category=GlossaryCategory.COSTS_TAXES)

        assert len(terms) == 1
        assert total == 1


class TestGetTermBySlug:
    """Tests for getting a term by slug."""

    def test_returns_term_for_valid_slug(self, sample_term: MagicMock) -> None:
        """Test that term is returned for valid slug."""
        mock_session = MagicMock()
        mock_session.exec.return_value.scalars.return_value.first.return_value = (
            sample_term
        )

        result = get_term_by_slug(mock_session, "grunderwerbsteuer")

        assert result == sample_term
        assert result.slug == "grunderwerbsteuer"

    def test_raises_not_found_for_missing_slug(self) -> None:
        """Test that GlossaryTermNotFoundError is raised for missing slug."""
        mock_session = MagicMock()
        mock_session.exec.return_value.scalars.return_value.first.return_value = None

        with pytest.raises(GlossaryTermNotFoundError):
            get_term_by_slug(mock_session, "nonexistent-term")


class TestGetCategories:
    """Tests for getting categories with counts."""

    def test_returns_categories_with_counts(self) -> None:
        """Test that categories are returned with term counts."""
        mock_session = MagicMock()
        mock_session.execute.return_value.all.return_value = [
            ("buying_process", 10),
            ("costs_taxes", 8),
            ("financing", 6),
        ]

        result = get_categories(mock_session)

        assert len(result) == 3
        assert result[0] == ("buying_process", 10)
        assert result[1] == ("costs_taxes", 8)

    def test_returns_empty_when_no_terms(self) -> None:
        """Test that empty list is returned when no terms exist."""
        mock_session = MagicMock()
        mock_session.execute.return_value.all.return_value = []

        result = get_categories(mock_session)

        assert len(result) == 0


class TestGetRelatedTerms:
    """Tests for getting related terms by slug list."""

    def test_returns_terms_for_valid_slugs(
        self, sample_term: MagicMock, sample_term_2: MagicMock
    ) -> None:
        """Test that related terms are returned for valid slugs."""
        mock_session = MagicMock()
        mock_session.exec.return_value.scalars.return_value.all.return_value = [
            sample_term,
            sample_term_2,
        ]

        result = get_related_terms(mock_session, ["grunderwerbsteuer", "kaufvertrag"])

        assert len(result) == 2

    def test_returns_empty_for_empty_slugs(self) -> None:
        """Test that empty list is returned for empty slug list."""
        mock_session = MagicMock()

        result = get_related_terms(mock_session, [])

        assert len(result) == 0
        mock_session.exec.assert_not_called()
