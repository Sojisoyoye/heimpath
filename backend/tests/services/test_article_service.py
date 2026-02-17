"""Tests for article service module-level functions."""

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.models.article import (
    Article,
    ArticleCategory,
    ArticleRating,
    ArticleStatus,
    DifficultyLevel,
)
from app.services.article_service import (
    ArticleNotFoundError,
    ArticleSlugExistsError,
    _calculate_reading_time,
)

# --- Reading time tests (pure function, no mocking needed) ---


def test_calculate_reading_time_short_content() -> None:
    """Test reading time calculation for short content returns minimum 1."""
    assert _calculate_reading_time("hello world") == 1


def test_calculate_reading_time_200_words() -> None:
    """Test that 200 words = 1 minute."""
    content = " ".join(["word"] * 200)
    assert _calculate_reading_time(content) == 1


def test_calculate_reading_time_400_words() -> None:
    """Test that 400 words = 2 minutes."""
    content = " ".join(["word"] * 400)
    assert _calculate_reading_time(content) == 2


def test_calculate_reading_time_1000_words() -> None:
    """Test that 1000 words = 5 minutes."""
    content = " ".join(["word"] * 1000)
    assert _calculate_reading_time(content) == 5


def test_calculate_reading_time_empty_string() -> None:
    """Test reading time for empty content returns 1."""
    assert _calculate_reading_time("") == 1


# --- Service function tests with mocked session ---


def _make_article(**overrides) -> MagicMock:
    """Create a mock article."""
    article = MagicMock(spec=Article)
    article.id = overrides.get("id", uuid.uuid4())
    article.slug = overrides.get("slug", "test-slug")
    article.title = overrides.get("title", "Test Article")
    article.meta_description = overrides.get("meta_description", "Test desc")
    article.category = overrides.get("category", ArticleCategory.BUYING_PROCESS.value)
    article.difficulty_level = overrides.get(
        "difficulty_level", DifficultyLevel.BEGINNER.value
    )
    article.status = overrides.get("status", ArticleStatus.PUBLISHED.value)
    article.excerpt = overrides.get("excerpt", "Test excerpt")
    article.content = overrides.get("content", "Test content")
    article.key_takeaways = overrides.get("key_takeaways", [])
    article.reading_time_minutes = overrides.get("reading_time_minutes", 1)
    article.view_count = overrides.get("view_count", 0)
    article.author_name = overrides.get("author_name", "Test Author")
    article.related_law_ids = overrides.get("related_law_ids", [])
    article.related_calculator_types = overrides.get("related_calculator_types", [])
    article.created_at = overrides.get("created_at", None)
    article.updated_at = overrides.get("updated_at", None)
    return article


@patch("app.services.article_service.select")
def test_get_article_by_slug_not_found(_mock_select: MagicMock) -> None:
    """Test that get_article_by_slug raises for non-existent slug."""
    from app.services.article_service import get_article_by_slug

    session = MagicMock()
    session.exec.return_value.scalars.return_value.first.return_value = None

    with pytest.raises(ArticleNotFoundError):
        get_article_by_slug(session, "nonexistent")


@patch("app.services.article_service.select")
def test_get_article_by_slug_found(_mock_select: MagicMock) -> None:
    """Test that get_article_by_slug returns article when found."""
    from app.services.article_service import get_article_by_slug

    mock_article = _make_article(slug="found-slug")
    session = MagicMock()
    session.exec.return_value.scalars.return_value.first.return_value = mock_article

    result = get_article_by_slug(session, "found-slug")
    assert result.slug == "found-slug"


@patch("app.services.article_service.select")
def test_get_article_by_id_not_found(_mock_select: MagicMock) -> None:
    """Test that get_article_by_id raises for non-existent ID."""
    from app.services.article_service import get_article_by_id

    session = MagicMock()
    session.exec.return_value.scalars.return_value.first.return_value = None

    with pytest.raises(ArticleNotFoundError):
        get_article_by_id(session, uuid.uuid4())


def test_get_categories_returns_four() -> None:
    """Test that get_categories returns all 4 categories."""
    from app.services.article_service import get_categories

    session = MagicMock()
    session.execute.return_value = []

    categories = get_categories(session)
    assert len(categories) == 4
    keys = [c.key for c in categories]
    assert "buying_process" in keys
    assert "costs_and_taxes" in keys
    assert "regulations" in keys
    assert "common_pitfalls" in keys


@patch("app.services.article_service.get_article_by_id")
def test_increment_view_count(mock_get: MagicMock) -> None:
    """Test that increment_view_count increments the count."""
    from app.services.article_service import increment_view_count

    mock_article = _make_article(view_count=5)
    mock_get.return_value = mock_article
    session = MagicMock()

    increment_view_count(session, mock_article.id)

    assert mock_article.view_count == 6
    session.add.assert_called_once_with(mock_article)
    session.commit.assert_called_once()


@patch("app.services.article_service.get_article_by_id")
@patch("app.services.article_service.select")
def test_rate_article_creates_new(_mock_select: MagicMock, mock_get: MagicMock) -> None:
    """Test rating creates new rating when none exists."""
    from app.services.article_service import rate_article

    mock_get.return_value = _make_article()
    session = MagicMock()
    session.exec.return_value.scalars.return_value.first.return_value = None

    rate_article(session, uuid.uuid4(), uuid.uuid4(), True)

    session.add.assert_called_once()
    session.commit.assert_called_once()


@patch("app.services.article_service.get_article_by_id")
@patch("app.services.article_service.select")
def test_rate_article_upserts_existing(
    _mock_select: MagicMock, mock_get: MagicMock
) -> None:
    """Test rating updates existing rating."""
    from app.services.article_service import rate_article

    mock_get.return_value = _make_article()
    existing_rating = MagicMock(spec=ArticleRating)
    existing_rating.is_helpful = True
    session = MagicMock()
    session.exec.return_value.scalars.return_value.first.return_value = existing_rating

    rate_article(session, uuid.uuid4(), uuid.uuid4(), False)

    assert existing_rating.is_helpful is False
    session.add.assert_called_once_with(existing_rating)


@patch("app.services.article_service.select")
def test_create_article_duplicate_slug_raises(_mock_select: MagicMock) -> None:
    """Test that creating with duplicate slug raises."""
    from app.services.article_service import create_article

    session = MagicMock()
    session.exec.return_value.scalars.return_value.first.return_value = _make_article()

    with pytest.raises(ArticleSlugExistsError):
        create_article(
            session,
            {
                "slug": "existing-slug",
                "content": "test content",
            },
        )


@patch("app.services.article_service.get_article_by_id")
def test_delete_article_calls_delete(mock_get: MagicMock) -> None:
    """Test that delete_article calls session.delete."""
    from app.services.article_service import delete_article

    mock_article = _make_article()
    mock_get.return_value = mock_article
    session = MagicMock()

    delete_article(session, mock_article.id)

    session.delete.assert_called_once_with(mock_article)
    session.commit.assert_called_once()
