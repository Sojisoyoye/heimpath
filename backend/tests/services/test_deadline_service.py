"""Tests for the deadline reminder service."""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.services import deadline_service
from app.services.deadline_service import (
    REMINDER_MILESTONES,
    _already_notified,
    _build_message,
    _create_reminder,
    _get_journeys_with_upcoming_deadline,
    send_deadline_reminders,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_session():
    return MagicMock()


@pytest.fixture
def user_id():
    return uuid.uuid4()


@pytest.fixture
def journey_id():
    return uuid.uuid4()


def _make_journey(
    user_id: uuid.UUID,
    journey_id: uuid.UUID,
    days_from_today: int,
) -> MagicMock:
    """Create a mock Journey with target_purchase_date set to N days from now."""
    today = datetime.now(timezone.utc)
    target = today + timedelta(days=days_from_today)

    journey = MagicMock()
    journey.id = journey_id
    journey.user_id = user_id
    journey.target_purchase_date = target
    return journey


# ---------------------------------------------------------------------------
# _build_message
# ---------------------------------------------------------------------------


class TestBuildMessage:
    def test_1_day_message(self) -> None:
        msg = _build_message(1)
        assert "tomorrow" in msg.lower()

    def test_7_day_message(self) -> None:
        msg = _build_message(7)
        assert "one week" in msg.lower()

    def test_30_day_message(self) -> None:
        msg = _build_message(30)
        assert "30 days" in msg

    def test_90_day_message(self) -> None:
        msg = _build_message(90)
        assert "90 days" in msg

    def test_all_milestones_return_non_empty(self) -> None:
        for milestone in REMINDER_MILESTONES:
            assert _build_message(milestone)


# ---------------------------------------------------------------------------
# _already_notified
# ---------------------------------------------------------------------------


class TestAlreadyNotified:
    def test_returns_false_when_no_existing_notification(
        self, mock_session, user_id
    ) -> None:
        mock_session.execute.return_value.scalar_one_or_none.return_value = None
        result = _already_notified(mock_session, user_id, "/journeys/abc")
        assert result is False

    def test_returns_true_when_notification_exists(self, mock_session, user_id) -> None:
        mock_session.execute.return_value.scalar_one_or_none.return_value = MagicMock()
        result = _already_notified(mock_session, user_id, "/journeys/abc")
        assert result is True


# ---------------------------------------------------------------------------
# _get_journeys_with_upcoming_deadline
# ---------------------------------------------------------------------------


class TestGetJourneysWithUpcomingDeadline:
    def test_returns_list_from_session(self, mock_session, user_id) -> None:
        mock_journey = _make_journey(user_id, uuid.uuid4(), days_from_today=30)
        mock_session.exec.return_value.all.return_value = [mock_journey]

        today = datetime.now(timezone.utc).date()
        result = _get_journeys_with_upcoming_deadline(mock_session, today)

        assert result == [mock_journey]

    def test_returns_empty_list_when_no_journeys(self, mock_session) -> None:
        mock_session.exec.return_value.all.return_value = []
        today = datetime.now(timezone.utc).date()
        result = _get_journeys_with_upcoming_deadline(mock_session, today)
        assert result == []


# ---------------------------------------------------------------------------
# _create_reminder
# ---------------------------------------------------------------------------


class TestCreateReminder:
    @patch("app.services.deadline_service._build_message", return_value="Test msg")
    @patch("app.services.notification_service.create_notification")
    def test_calls_notification_service(
        self,
        mock_create,
        mock_msg,
        mock_session,
        user_id,
        journey_id,
    ) -> None:
        journey = _make_journey(user_id, journey_id, days_from_today=30)
        action_url = f"/journeys/{journey_id}"

        _create_reminder(mock_session, journey, 30, action_url)

        mock_create.assert_called_once()
        _, kwargs = mock_create.call_args
        assert kwargs["user_id"] == user_id
        assert kwargs["action_url"] == action_url
        assert "30" in kwargs["title"]

    def test_title_is_singular_for_one_day(
        self, mock_session, user_id, journey_id
    ) -> None:
        journey = _make_journey(user_id, journey_id, days_from_today=1)
        action_url = f"/journeys/{journey_id}"

        with patch(
            "app.services.notification_service.create_notification"
        ) as mock_create:
            _create_reminder(mock_session, journey, 1, action_url)

        _, kwargs = mock_create.call_args
        assert "1 day" in kwargs["title"]
        assert "days" not in kwargs["title"]


# ---------------------------------------------------------------------------
# send_deadline_reminders
# ---------------------------------------------------------------------------


class TestSendDeadlineReminders:
    def test_sends_notification_on_milestone_day(
        self, mock_session, user_id, journey_id
    ) -> None:
        journey = _make_journey(user_id, journey_id, days_from_today=30)

        with (
            patch.object(
                deadline_service,
                "_get_journeys_with_upcoming_deadline",
                return_value=[journey],
            ),
            patch.object(deadline_service, "_already_notified", return_value=False),
            patch.object(deadline_service, "_create_reminder") as mock_create,
        ):
            count = send_deadline_reminders(mock_session)

        assert count == 1
        mock_create.assert_called_once()

    def test_skips_non_milestone_day(self, mock_session, user_id, journey_id) -> None:
        journey = _make_journey(user_id, journey_id, days_from_today=45)

        with (
            patch.object(
                deadline_service,
                "_get_journeys_with_upcoming_deadline",
                return_value=[journey],
            ),
            patch.object(deadline_service, "_create_reminder") as mock_create,
        ):
            count = send_deadline_reminders(mock_session)

        assert count == 0
        mock_create.assert_not_called()

    def test_skips_duplicate_notification(
        self, mock_session, user_id, journey_id
    ) -> None:
        journey = _make_journey(user_id, journey_id, days_from_today=7)

        with (
            patch.object(
                deadline_service,
                "_get_journeys_with_upcoming_deadline",
                return_value=[journey],
            ),
            patch.object(deadline_service, "_already_notified", return_value=True),
            patch.object(deadline_service, "_create_reminder") as mock_create,
        ):
            count = send_deadline_reminders(mock_session)

        assert count == 0
        mock_create.assert_not_called()

    def test_sends_multiple_notifications_for_multiple_journeys(
        self, mock_session
    ) -> None:
        uid1, jid1 = uuid.uuid4(), uuid.uuid4()
        uid2, jid2 = uuid.uuid4(), uuid.uuid4()
        journey1 = _make_journey(uid1, jid1, days_from_today=30)
        journey2 = _make_journey(uid2, jid2, days_from_today=7)

        with (
            patch.object(
                deadline_service,
                "_get_journeys_with_upcoming_deadline",
                return_value=[journey1, journey2],
            ),
            patch.object(deadline_service, "_already_notified", return_value=False),
            patch.object(deadline_service, "_create_reminder") as mock_create,
        ):
            count = send_deadline_reminders(mock_session)

        assert count == 2
        assert mock_create.call_count == 2

    def test_returns_zero_when_no_journeys(self, mock_session) -> None:
        with patch.object(
            deadline_service,
            "_get_journeys_with_upcoming_deadline",
            return_value=[],
        ):
            count = send_deadline_reminders(mock_session)

        assert count == 0
