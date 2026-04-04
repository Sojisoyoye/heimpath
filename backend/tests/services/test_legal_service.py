"""Tests for the Legal Service."""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from app.models.legal import (
    Law,
    LawBookmark,
    LawCategory,
    PropertyTypeApplicability,
)
from app.schemas.legal import LawFilter
from app.services.legal_service import (
    BookmarkAlreadyExistsError,
    BookmarkNotFoundError,
    LawNotFoundError,
    create_bookmark,
    delete_bookmark,
    get_law,
    get_law_by_citation,
    get_laws,
    get_laws_by_category,
    get_related_laws,
    get_user_bookmarks,
    is_bookmarked,
    search_laws,
)


@pytest.fixture
def sample_law() -> MagicMock:
    """Create a sample law mock."""
    law = MagicMock(spec=Law)
    law.id = uuid.uuid4()
    law.citation = "§ 433 BGB"
    law.title_de = "Vertragstypische Pflichten beim Kaufvertrag"
    law.title_en = "Typical Obligations in a Purchase Contract"
    law.category = LawCategory.BUYING_PROCESS.value
    law.property_type = PropertyTypeApplicability.ALL.value
    law.one_line_summary = "Defines buyer and seller obligations in property sales."
    law.short_summary = "This section defines the core obligations."
    law.detailed_explanation = "In German property law..."
    law.real_world_example = "When buying an apartment..."
    law.court_rulings = []
    law.state_variations = []
    law.created_at = datetime.now(timezone.utc)
    law.updated_at = datetime.now(timezone.utc)
    return law


class TestGetLaws:
    """Tests for getting laws."""

    def test_returns_laws_with_count(self, sample_law: MagicMock) -> None:
        """Test that get_laws returns laws with count."""
        mock_session = MagicMock()
        # Mock for count query (first call)
        mock_exec_count = MagicMock()
        mock_exec_count.scalar.return_value = 1
        # Mock for laws query (second call)
        mock_exec_laws = MagicMock()
        mock_exec_laws.scalars.return_value.all.return_value = [sample_law]
        # Set up side effects for sequential calls
        mock_session.exec.side_effect = [mock_exec_count, mock_exec_laws]

        filters = LawFilter(page=1, page_size=20)
        laws, total = get_laws(mock_session, filters)

        assert len(laws) == 1
        assert total == 1


class TestGetLaw:
    """Tests for getting a single law."""

    def test_raises_not_found_for_missing_law(self) -> None:
        """Test that LawNotFoundError is raised for missing law."""
        mock_session = MagicMock()
        mock_session.exec.return_value.scalars.return_value.first.return_value = None

        with pytest.raises(LawNotFoundError):
            get_law(mock_session, uuid.uuid4())

    def test_returns_law_for_valid_id(self, sample_law: MagicMock) -> None:
        """Test that law is returned for valid ID."""
        mock_session = MagicMock()
        mock_session.exec.return_value.scalars.return_value.first.return_value = (
            sample_law
        )

        result = get_law(mock_session, sample_law.id)

        assert result == sample_law


class TestGetLawByCitation:
    """Tests for getting a law by citation."""

    def test_raises_not_found_for_missing_citation(self) -> None:
        """Test that LawNotFoundError is raised for missing citation."""
        mock_session = MagicMock()
        mock_session.exec.return_value.scalars.return_value.first.return_value = None

        with pytest.raises(LawNotFoundError):
            get_law_by_citation(mock_session, "§ 999 BGB")

    def test_returns_law_for_valid_citation(self, sample_law: MagicMock) -> None:
        """Test that law is returned for valid citation."""
        mock_session = MagicMock()
        mock_session.exec.return_value.scalars.return_value.first.return_value = (
            sample_law
        )

        result = get_law_by_citation(mock_session, "§ 433 BGB")

        assert result == sample_law


class TestBookmarks:
    """Tests for bookmark functionality."""

    def test_is_bookmarked_returns_true_when_bookmarked(self) -> None:
        """Test that is_bookmarked returns True when bookmarked."""
        mock_session = MagicMock()
        mock_bookmark = MagicMock(spec=LawBookmark)
        mock_session.exec.return_value.scalars.return_value.first.return_value = (
            mock_bookmark
        )

        result = is_bookmarked(mock_session, uuid.uuid4(), uuid.uuid4())

        assert result is True

    def test_is_bookmarked_returns_false_when_not_bookmarked(self) -> None:
        """Test that is_bookmarked returns False when not bookmarked."""
        mock_session = MagicMock()
        mock_session.exec.return_value.scalars.return_value.first.return_value = None

        result = is_bookmarked(mock_session, uuid.uuid4(), uuid.uuid4())

        assert result is False

    def test_create_bookmark_success(self, sample_law: MagicMock) -> None:
        """Test successful bookmark creation."""
        mock_session = MagicMock()
        # First call returns law (get_law), second returns None (is_bookmarked)
        mock_scalars1 = MagicMock()
        mock_scalars1.first.return_value = sample_law
        mock_scalars2 = MagicMock()
        mock_scalars2.first.return_value = None
        mock_session.exec.return_value.scalars.side_effect = [
            mock_scalars1,
            mock_scalars2,
        ]

        law_id = sample_law.id
        user_id = uuid.uuid4()

        create_bookmark(mock_session, law_id, user_id, notes="Important law")

        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()

    def test_create_bookmark_raises_already_exists(
        self, sample_law: MagicMock
    ) -> None:
        """Test that BookmarkAlreadyExistsError is raised for duplicate."""
        mock_session = MagicMock()
        mock_bookmark = MagicMock(spec=LawBookmark)
        # First call returns law (get_law), second returns existing bookmark (is_bookmarked)
        mock_scalars1 = MagicMock()
        mock_scalars1.first.return_value = sample_law
        mock_scalars2 = MagicMock()
        mock_scalars2.first.return_value = mock_bookmark
        mock_session.exec.return_value.scalars.side_effect = [
            mock_scalars1,
            mock_scalars2,
        ]

        with pytest.raises(BookmarkAlreadyExistsError):
            create_bookmark(mock_session, sample_law.id, uuid.uuid4())

    def test_delete_bookmark_success(self) -> None:
        """Test successful bookmark deletion."""
        mock_session = MagicMock()
        mock_bookmark = MagicMock(spec=LawBookmark)
        mock_session.exec.return_value.scalars.return_value.first.return_value = (
            mock_bookmark
        )

        delete_bookmark(mock_session, uuid.uuid4(), uuid.uuid4())

        mock_session.delete.assert_called_once_with(mock_bookmark)
        mock_session.commit.assert_called_once()

    def test_delete_bookmark_raises_not_found(self) -> None:
        """Test that BookmarkNotFoundError is raised for missing bookmark."""
        mock_session = MagicMock()
        mock_session.exec.return_value.scalars.return_value.first.return_value = None

        with pytest.raises(BookmarkNotFoundError):
            delete_bookmark(mock_session, uuid.uuid4(), uuid.uuid4())


class TestGetUserBookmarks:
    """Tests for getting user bookmarks."""

    def test_returns_user_bookmarks(self, sample_law: MagicMock) -> None:
        """Test that user bookmarks are returned."""
        mock_session = MagicMock()
        mock_bookmark = MagicMock(spec=LawBookmark)
        mock_bookmark.law = sample_law
        mock_session.exec.return_value.scalars.return_value.all.return_value = [
            mock_bookmark
        ]

        result = get_user_bookmarks(mock_session, uuid.uuid4())

        assert len(result) == 1


class TestGetLawsByCategory:
    """Tests for getting laws by category."""

    def test_returns_laws_for_category(self, sample_law: MagicMock) -> None:
        """Test that laws are returned for a category."""
        mock_session = MagicMock()
        mock_session.exec.return_value.scalars.return_value.all.return_value = [
            sample_law
        ]

        result = get_laws_by_category(mock_session, LawCategory.BUYING_PROCESS)

        assert len(result) == 1


class TestGetRelatedLaws:
    """Tests for getting related laws."""

    def test_returns_related_laws(self, sample_law: MagicMock) -> None:
        """Test that related laws are returned."""
        mock_session = MagicMock()
        mock_session.exec.return_value.scalars.return_value.all.return_value = [
            sample_law
        ]

        result = get_related_laws(mock_session, uuid.uuid4())

        assert len(result) == 1
