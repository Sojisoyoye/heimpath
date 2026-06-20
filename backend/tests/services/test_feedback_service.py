"""Tests for the Feedback Service."""

import hashlib
import hmac
import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate
from app.services.feedback_service import (
    _notify_email,
    _notify_growthos,
    create_feedback,
    create_feedback_sync,
    notify_feedback,
)


@pytest.fixture
def user_id() -> uuid.UUID:
    """Create a test user ID."""
    return uuid.uuid4()


@pytest.fixture
def mock_session() -> MagicMock:
    """Create a mock sync session."""
    return MagicMock()


@pytest.fixture
def sample_feedback() -> Feedback:
    """A Feedback instance with scalar attributes pre-set (no DB needed)."""
    return Feedback(
        user_id=uuid.uuid4(),
        category="bug",
        message="Something is broken on the calculator page",
        page_url="/calculators",
    )


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

        create_feedback(mock_session, user_id, data)

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


class TestCreateFeedbackSync:
    """Tests for create_feedback_sync — pure storage with no side effects."""

    def test_stores_feedback_to_session(
        self, mock_session: MagicMock, user_id: uuid.UUID
    ) -> None:
        """Should add, commit, and refresh without calling notify."""
        data = FeedbackCreate(category="bug", message="Something is broken here again")

        with patch("app.services.feedback_service.notify_feedback") as mock_notify:
            result = create_feedback_sync(mock_session, user_id, data)
            mock_notify.assert_not_called()

        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
        mock_session.refresh.assert_called_once()
        assert isinstance(result, Feedback)

    def test_sets_correct_fields(
        self, mock_session: MagicMock, user_id: uuid.UUID
    ) -> None:
        """Should set user_id, category, message, and page_url on the Feedback."""
        data = FeedbackCreate(
            category="question",
            message="How do I upload a document here?",
            page_url="/documents",
        )

        create_feedback_sync(mock_session, user_id, data)

        added = mock_session.add.call_args[0][0]
        assert added.user_id == user_id
        assert added.category == "question"
        assert added.message == "How do I upload a document here?"
        assert added.page_url == "/documents"


class TestNotifyFeedback:
    """Tests for notify_feedback — dispatches to email and GrowthOS."""

    def test_calls_both_notifiers(self, sample_feedback: Feedback) -> None:
        """Should call _notify_email and _notify_growthos exactly once each."""
        with (
            patch("app.services.feedback_service._notify_email") as mock_email,
            patch("app.services.feedback_service._notify_growthos") as mock_growthos,
        ):
            notify_feedback(sample_feedback, "user@example.com")

        mock_email.assert_called_once_with(sample_feedback, "user@example.com")
        mock_growthos.assert_called_once_with(sample_feedback, "user@example.com")


class TestNotifyEmail:
    """Tests for _notify_email — admin email notification."""

    def test_sends_email_when_enabled(self, sample_feedback: Feedback) -> None:
        """Should call send_email to FIRST_SUPERUSER when emails_enabled is True."""
        with (
            patch("app.services.feedback_service.settings") as mock_settings,
            patch("app.services.feedback_service.send_email") as mock_send,
        ):
            mock_settings.emails_enabled = True
            mock_settings.FIRST_SUPERUSER = "admin@example.com"

            _notify_email(sample_feedback, "user@example.com")

        mock_send.assert_called_once()
        assert mock_send.call_args.kwargs["email_to"] == "admin@example.com"
        assert "user@example.com" in mock_send.call_args.kwargs["html_content"]

    def test_skips_email_when_disabled(self, sample_feedback: Feedback) -> None:
        """Should not call send_email when emails_enabled is False."""
        with (
            patch("app.services.feedback_service.settings") as mock_settings,
            patch("app.services.feedback_service.send_email") as mock_send,
        ):
            mock_settings.emails_enabled = False

            _notify_email(sample_feedback, "user@example.com")

        mock_send.assert_not_called()

    def test_swallows_send_email_exceptions(self, sample_feedback: Feedback) -> None:
        """Exceptions from send_email should be caught and logged — not re-raised."""
        with (
            patch("app.services.feedback_service.settings") as mock_settings,
            patch(
                "app.services.feedback_service.send_email",
                side_effect=RuntimeError("SMTP unavailable"),
            ),
        ):
            mock_settings.emails_enabled = True
            mock_settings.FIRST_SUPERUSER = "admin@example.com"

            _notify_email(sample_feedback, "user@example.com")


class TestNotifyGrowthos:
    """Tests for _notify_growthos — GrowthOS webhook notification."""

    def test_no_op_when_url_not_configured(self, sample_feedback: Feedback) -> None:
        """Should make no HTTP call when GROWTHOS_API_URL is None."""
        with (
            patch("app.services.feedback_service.settings") as mock_settings,
            patch("httpx.Client") as mock_http,
        ):
            mock_settings.GROWTHOS_API_URL = None

            _notify_growthos(sample_feedback, "user@example.com")

        mock_http.assert_not_called()

    def test_posts_with_hmac_signature(self, sample_feedback: Feedback) -> None:
        """Should send POST with x-hub-signature-256 HMAC header."""
        secret = "test-webhook-secret"
        with patch("app.services.feedback_service.settings") as mock_settings:
            mock_settings.GROWTHOS_API_URL = "https://growthos.example.com"
            mock_settings.GROWTHOS_WEBHOOK_SECRET = secret

            mock_response = MagicMock()
            mock_client_instance = MagicMock()
            mock_client_instance.post.return_value = mock_response

            with patch("httpx.Client") as mock_httpx:
                mock_httpx.return_value.__enter__.return_value = mock_client_instance

                _notify_growthos(sample_feedback, "user@example.com")

        mock_client_instance.post.assert_called_once()
        call_kwargs = mock_client_instance.post.call_args.kwargs
        headers = call_kwargs["headers"]
        assert "x-hub-signature-256" in headers
        assert headers["x-hub-signature-256"].startswith("sha256=")
        body = call_kwargs["content"]
        expected = (
            "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        )
        assert headers["x-hub-signature-256"] == expected

    def test_calls_raise_for_status(self, sample_feedback: Feedback) -> None:
        """Should call raise_for_status() on the response to catch 4xx/5xx errors."""
        with patch("app.services.feedback_service.settings") as mock_settings:
            mock_settings.GROWTHOS_API_URL = "https://growthos.example.com"
            mock_settings.GROWTHOS_WEBHOOK_SECRET = ""

            mock_response = MagicMock()
            mock_client_instance = MagicMock()
            mock_client_instance.post.return_value = mock_response

            with patch("httpx.Client") as mock_httpx:
                mock_httpx.return_value.__enter__.return_value = mock_client_instance

                _notify_growthos(sample_feedback, "user@example.com")

        mock_response.raise_for_status.assert_called_once()

    def test_swallows_network_exceptions(self, sample_feedback: Feedback) -> None:
        """Exceptions from the HTTP call should be caught and logged — not re-raised."""
        with patch("app.services.feedback_service.settings") as mock_settings:
            mock_settings.GROWTHOS_API_URL = "https://growthos.example.com"
            mock_settings.GROWTHOS_WEBHOOK_SECRET = ""

            mock_client_instance = MagicMock()
            mock_client_instance.post.side_effect = RuntimeError("connection refused")

            with patch("httpx.Client") as mock_httpx:
                mock_httpx.return_value.__enter__.return_value = mock_client_instance

                _notify_growthos(sample_feedback, "user@example.com")

    def test_swallows_http_status_errors(self, sample_feedback: Feedback) -> None:
        """HTTP 4xx/5xx from raise_for_status should be caught and logged."""
        import httpx

        with patch("app.services.feedback_service.settings") as mock_settings:
            mock_settings.GROWTHOS_API_URL = "https://growthos.example.com"
            mock_settings.GROWTHOS_WEBHOOK_SECRET = ""

            mock_response = MagicMock()
            mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "404 Not Found",
                request=MagicMock(),
                response=MagicMock(),
            )
            mock_client_instance = MagicMock()
            mock_client_instance.post.return_value = mock_response

            with patch("httpx.Client") as mock_httpx:
                mock_httpx.return_value.__enter__.return_value = mock_client_instance

                _notify_growthos(sample_feedback, "user@example.com")


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
