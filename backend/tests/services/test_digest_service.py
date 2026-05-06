"""Tests for weekly digest service."""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.models.notification import NotificationType
from app.services import digest_service


@pytest.fixture
def mock_session():
    return MagicMock()


@pytest.fixture
def user_id():
    return uuid.uuid4()


class TestIsDigestEnabled:
    def test_returns_true_when_no_preference_exists(
        self, mock_session, user_id
    ) -> None:
        mock_session.execute.return_value.scalar_one_or_none.return_value = None
        assert digest_service._is_digest_enabled(mock_session, user_id) is True

    def test_returns_true_when_enabled(self, mock_session, user_id) -> None:
        pref = MagicMock()
        pref.is_email_enabled = True
        mock_session.execute.return_value.scalar_one_or_none.return_value = pref
        assert digest_service._is_digest_enabled(mock_session, user_id) is True

    def test_returns_false_when_disabled(self, mock_session, user_id) -> None:
        pref = MagicMock()
        pref.is_email_enabled = False
        mock_session.execute.return_value.scalar_one_or_none.return_value = pref
        assert digest_service._is_digest_enabled(mock_session, user_id) is False


class TestBuildDigestData:
    @patch("app.services.digest_service._get_journey_summary")
    @patch("app.services.digest_service._get_recent_activity")
    @patch("app.services.digest_service._count_since")
    def test_has_activity_true_when_there_is_activity(
        self, mock_count, mock_activity, mock_journey, mock_session, user_id
    ) -> None:
        mock_journey.return_value = None
        mock_activity.return_value = [
            {"title": "Uploaded document", "description": "contract.pdf"}
        ]
        mock_count.return_value = 1

        since = datetime.now(timezone.utc) - timedelta(days=7)
        data = digest_service._build_digest_data(mock_session, user_id, since=since)

        assert data["has_activity"] is True
        assert len(data["recent_activity"]) == 1

    @patch("app.services.digest_service._get_journey_summary")
    @patch("app.services.digest_service._get_recent_activity")
    @patch("app.services.digest_service._count_since")
    def test_has_activity_false_when_no_activity(
        self, mock_count, mock_activity, mock_journey, mock_session, user_id
    ) -> None:
        mock_journey.return_value = None
        mock_activity.return_value = []
        mock_count.return_value = 0

        since = datetime.now(timezone.utc) - timedelta(days=7)
        data = digest_service._build_digest_data(mock_session, user_id, since=since)

        assert data["has_activity"] is False


class TestSendWeeklyDigest:
    @patch("app.services.digest_service._send_digest_email")
    @patch("app.services.digest_service._build_digest_data")
    @patch("app.services.digest_service._is_digest_enabled")
    def test_skips_users_with_no_activity(
        self, mock_enabled, mock_build, mock_send, mock_session
    ) -> None:
        user = MagicMock()
        user.id = uuid.uuid4()
        user.email = "test@example.com"
        user.is_active = True

        mock_session.exec.return_value = iter([user])
        mock_enabled.return_value = True
        mock_build.return_value = {
            "journey_summary": None,
            "recent_activity": [],
            "stats": {
                "documents_translated": 0,
                "calculations_saved": 0,
                "bookmarks_added": 0,
            },
            "has_activity": False,
        }

        count = digest_service.send_weekly_digest(mock_session)

        assert count == 0
        mock_send.assert_not_called()

    @patch("app.services.digest_service._send_digest_email")
    @patch("app.services.digest_service._build_digest_data")
    @patch("app.services.digest_service._is_digest_enabled")
    def test_sends_to_users_with_activity(
        self, mock_enabled, mock_build, mock_send, mock_session
    ) -> None:
        user = MagicMock()
        user.id = uuid.uuid4()
        user.email = "active@example.com"
        user.is_active = True

        mock_session.exec.return_value = iter([user])
        mock_enabled.return_value = True
        mock_build.return_value = {
            "journey_summary": None,
            "recent_activity": [{"title": "Step", "description": "Research"}],
            "stats": {
                "documents_translated": 2,
                "calculations_saved": 1,
                "bookmarks_added": 0,
            },
            "has_activity": True,
        }

        count = digest_service.send_weekly_digest(mock_session)

        assert count == 1
        mock_send.assert_called_once()

    @patch("app.services.digest_service._send_digest_email")
    @patch("app.services.digest_service._build_digest_data")
    @patch("app.services.digest_service._is_digest_enabled")
    def test_skips_users_with_digest_disabled(
        self, mock_enabled, mock_build, mock_send, mock_session
    ) -> None:
        user = MagicMock()
        user.id = uuid.uuid4()
        user.email = "optout@example.com"
        user.is_active = True

        mock_session.exec.return_value = iter([user])
        mock_enabled.return_value = False

        count = digest_service.send_weekly_digest(mock_session)

        assert count == 0
        mock_build.assert_not_called()
        mock_send.assert_not_called()

    @patch("app.services.digest_service._send_digest_email")
    @patch("app.services.digest_service._build_digest_data")
    @patch("app.services.digest_service._is_digest_enabled")
    def test_skips_users_without_email(
        self, mock_enabled, mock_build, mock_send, mock_session
    ) -> None:
        user = MagicMock()
        user.id = uuid.uuid4()
        user.email = None
        user.is_active = True

        mock_session.exec.return_value = iter([user])

        count = digest_service.send_weekly_digest(mock_session)

        assert count == 0
        mock_enabled.assert_not_called()

    @patch("app.services.digest_service._send_digest_email")
    @patch("app.services.digest_service._build_digest_data")
    @patch("app.services.digest_service._is_digest_enabled")
    def test_continues_on_send_failure(
        self, mock_enabled, mock_build, mock_send, mock_session
    ) -> None:
        user1 = MagicMock()
        user1.id = uuid.uuid4()
        user1.email = "fail@example.com"
        user1.is_active = True

        user2 = MagicMock()
        user2.id = uuid.uuid4()
        user2.email = "ok@example.com"
        user2.is_active = True

        mock_session.exec.return_value = iter([user1, user2])
        mock_enabled.return_value = True
        mock_build.return_value = {
            "journey_summary": None,
            "recent_activity": [{"title": "X", "description": "Y"}],
            "stats": {
                "documents_translated": 1,
                "calculations_saved": 0,
                "bookmarks_added": 0,
            },
            "has_activity": True,
        }
        mock_send.side_effect = [Exception("SMTP error"), None]

        count = digest_service.send_weekly_digest(mock_session)

        # Only user2 succeeded
        assert count == 1
        assert mock_send.call_count == 2


class TestSendDigestEmail:
    @patch("app.utils.send_email")
    @patch("app.utils.render_email_template")
    @patch("app.utils.generate_unsubscribe_token")
    def test_renders_and_sends_digest(self, mock_token, mock_render, mock_send) -> None:
        mock_token.return_value = "test-token"
        mock_render.return_value = "<html>digest</html>"

        user = MagicMock()
        user.id = uuid.uuid4()
        user.email = "user@example.com"
        user.full_name = "Test User"

        digest_data = {
            "journey_summary": {
                "title": "My Journey",
                "progress_percentage": 50,
                "next_step": "Next",
            },
            "recent_activity": [{"title": "Step", "description": "Done"}],
            "stats": {
                "documents_translated": 2,
                "calculations_saved": 1,
                "bookmarks_added": 0,
            },
        }

        digest_service._send_digest_email(user, digest_data)

        mock_token.assert_called_once_with(
            user.id, NotificationType.WEEKLY_DIGEST.value
        )
        mock_render.assert_called_once()
        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args[1]
        assert call_kwargs["email_to"] == "user@example.com"
        assert "unsubscribe" in call_kwargs["unsubscribe_url"]

    @patch("app.utils.send_email")
    @patch("app.utils.render_email_template")
    @patch("app.utils.generate_unsubscribe_token")
    def test_uses_email_when_no_full_name(
        self, mock_token, mock_render, mock_send
    ) -> None:
        mock_token.return_value = "tok"
        mock_render.return_value = "<html></html>"

        user = MagicMock()
        user.id = uuid.uuid4()
        user.email = "noname@example.com"
        user.full_name = None

        digest_data = {
            "journey_summary": None,
            "recent_activity": [],
            "stats": {
                "documents_translated": 0,
                "calculations_saved": 0,
                "bookmarks_added": 0,
            },
        }

        digest_service._send_digest_email(user, digest_data)

        render_ctx = mock_render.call_args[1]["context"]
        assert render_ctx["user_name"] == "noname@example.com"


class TestGetJourneySummary:
    @patch("app.services.digest_service.dashboard_service")
    def test_returns_summary_when_journey_exists(self, mock_dashboard) -> None:
        overview = MagicMock()
        overview.title = "My Journey"
        overview.progress_percentage = 75
        overview.next_step_title = "Sign contract"
        mock_dashboard.get_journey_overview.return_value = overview

        result = digest_service._get_journey_summary(MagicMock(), uuid.uuid4())

        assert result == {
            "title": "My Journey",
            "progress_percentage": 75,
            "next_step": "Sign contract",
        }

    @patch("app.services.digest_service.dashboard_service")
    def test_returns_none_when_no_journey(self, mock_dashboard) -> None:
        mock_dashboard.get_journey_overview.return_value = None

        result = digest_service._get_journey_summary(MagicMock(), uuid.uuid4())

        assert result is None


class _MockColumn:
    """Plain mock supporting SQLAlchemy-style comparison operators."""

    def __ge__(self, other):
        return True

    def __le__(self, other):
        return True

    def __eq__(self, other):
        return True

    def __hash__(self):
        return id(self)


class TestCountSince:
    @patch("app.services.digest_service.select")
    def test_counts_rows(self, mock_select) -> None:
        mock_session = MagicMock()
        mock_session.exec.return_value.one.return_value = 5

        since = datetime.now(timezone.utc) - timedelta(days=7)
        model = MagicMock()
        model.created_at = _MockColumn()
        model.user_id = _MockColumn()

        result = digest_service._count_since(mock_session, model, uuid.uuid4(), since)

        assert result == 5
        mock_session.exec.assert_called_once()
