"""Tests for the Feedback Service."""

import uuid
from unittest.mock import MagicMock

import pytest

from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate
from app.services.feedback_service import create_feedback


@pytest.fixture
def user_id() -> uuid.UUID:
    """Create a test user ID."""
    return uuid.uuid4()


@pytest.fixture
def mock_session() -> MagicMock:
    """Create a mock sync session."""
    return MagicMock()


class TestCreateFeedback:
    """Tests for create_feedback service function."""

    def test_creates_feedback_with_all_fields(
        self, mock_session: MagicMock, user_id: uuid.UUID
    ) -> None:
        """Should create feedback with category, message, and page_url."""
        data = FeedbackCreate(
            category="bug",
            message="Something is broken on the calculator page",
            page_url="/calculators",
        )

        result = create_feedback(mock_session, user_id, data)

        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
        mock_session.refresh.assert_called_once()
        added_feedback = mock_session.add.call_args[0][0]
        assert isinstance(added_feedback, Feedback)
        assert added_feedback.user_id == user_id
        assert added_feedback.category == "bug"
        assert added_feedback.message == "Something is broken on the calculator page"
        assert added_feedback.page_url == "/calculators"

    def test_creates_feedback_without_page_url(
        self, mock_session: MagicMock, user_id: uuid.UUID
    ) -> None:
        """Should create feedback when page_url is omitted."""
        data = FeedbackCreate(
            category="feature_request",
            message="Please add dark mode support",
        )

        create_feedback(mock_session, user_id, data)

        added_feedback = mock_session.add.call_args[0][0]
        assert added_feedback.page_url is None

    def test_returns_feedback_instance(
        self, mock_session: MagicMock, user_id: uuid.UUID
    ) -> None:
        """Should return the created Feedback model instance."""
        data = FeedbackCreate(
            category="improvement",
            message="The navigation could be more intuitive",
        )

        result = create_feedback(mock_session, user_id, data)

        assert isinstance(result, Feedback)


class TestFeedbackCreateValidation:
    """Tests for FeedbackCreate schema validation."""

    def test_rejects_invalid_category(self) -> None:
        """Should reject unknown category values."""
        with pytest.raises(ValueError):
            FeedbackCreate(category="invalid", message="Some valid message here")

    def test_rejects_short_message(self) -> None:
        """Should reject messages shorter than 10 characters."""
        with pytest.raises(ValueError):
            FeedbackCreate(category="bug", message="short")

    def test_accepts_valid_categories(self) -> None:
        """Should accept all valid category values."""
        for cat in ("bug", "feature_request", "improvement", "question", "other"):
            data = FeedbackCreate(category=cat, message="This is a valid message")
            assert data.category == cat
