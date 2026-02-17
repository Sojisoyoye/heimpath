"""Tests for notification service."""

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.models.notification import (
    NotificationType,
)
from app.schemas.notification import NotificationPreferenceItem
from app.services import notification_service


@pytest.fixture
def mock_session():
    return MagicMock()


@pytest.fixture
def user_id():
    return uuid.uuid4()


class TestCreateNotification:
    def test_creates_notification_when_in_app_enabled(
        self, mock_session, user_id
    ) -> None:
        mock_session.execute.return_value.scalar_one_or_none.return_value = None

        notification_service.create_notification(
            mock_session,
            user_id=user_id,
            type=NotificationType.STEP_COMPLETED,
            title="Step Completed",
            message="You completed the research step",
        )

        mock_session.add.assert_called_once()
        mock_session.commit.assert_called()

    def test_skips_creation_when_in_app_disabled(self, mock_session, user_id) -> None:
        pref = MagicMock()
        pref.is_in_app_enabled = False
        pref.is_email_enabled = False
        mock_session.execute.return_value.scalar_one_or_none.return_value = pref

        result = notification_service.create_notification(
            mock_session,
            user_id=user_id,
            type=NotificationType.STEP_COMPLETED,
            title="Step Completed",
            message="You completed the research step",
        )

        assert result is None
        mock_session.add.assert_not_called()

    @patch("app.services.notification_service._send_notification_email")
    def test_sends_email_when_email_enabled(
        self, mock_send, mock_session, user_id
    ) -> None:
        mock_session.execute.return_value.scalar_one_or_none.return_value = None

        notification_service.create_notification(
            mock_session,
            user_id=user_id,
            type=NotificationType.CALCULATION_SAVED,
            title="Calculation Saved",
            message="Your cost calculation has been saved",
            action_url="/calculators/123",
        )

        mock_send.assert_called_once_with(
            mock_session,
            user_id,
            "Calculation Saved",
            "Your cost calculation has been saved",
            "/calculators/123",
        )

    @patch("app.services.notification_service._send_notification_email")
    def test_skips_email_when_email_disabled(
        self, mock_send, mock_session, user_id
    ) -> None:
        pref = MagicMock()
        pref.is_in_app_enabled = True
        pref.is_email_enabled = False
        mock_session.execute.return_value.scalar_one_or_none.return_value = pref

        notification_service.create_notification(
            mock_session,
            user_id=user_id,
            type=NotificationType.STEP_COMPLETED,
            title="Step Completed",
            message="Done",
        )

        mock_send.assert_not_called()


class TestGetNotifications:
    def test_returns_paginated_notifications(self, mock_session, user_id) -> None:
        mock_notification = MagicMock()
        mock_notification.id = uuid.uuid4()
        mock_notification.type = NotificationType.STEP_COMPLETED.value
        mock_notification.title = "Test"
        mock_notification.message = "Test message"
        mock_notification.is_read = False
        mock_notification.action_url = None
        mock_notification.created_at = MagicMock()

        mock_session.execute.return_value.scalar.side_effect = [1, 1]
        mock_session.execute.return_value.scalars.return_value.all.return_value = [
            mock_notification
        ]

        result = notification_service.get_notifications(
            mock_session, user_id, limit=10, offset=0
        )

        assert result.count == 1
        assert result.unread_count == 1
        assert len(result.data) == 1

    def test_filters_unread_only(self, mock_session, user_id) -> None:
        mock_session.execute.return_value.scalar.side_effect = [0, 0]
        mock_session.execute.return_value.scalars.return_value.all.return_value = []

        result = notification_service.get_notifications(
            mock_session, user_id, unread_only=True
        )

        assert result.count == 0


class TestMarkAsRead:
    def test_marks_notification_as_read(self, mock_session, user_id) -> None:
        notification = MagicMock()
        notification.is_read = False
        mock_session.execute.return_value.scalar_one_or_none.return_value = notification

        result = notification_service.mark_as_read(mock_session, uuid.uuid4(), user_id)

        assert result is not None
        assert notification.is_read is True
        mock_session.commit.assert_called()

    def test_returns_none_when_not_found(self, mock_session, user_id) -> None:
        mock_session.execute.return_value.scalar_one_or_none.return_value = None

        result = notification_service.mark_as_read(mock_session, uuid.uuid4(), user_id)

        assert result is None


class TestMarkAllRead:
    def test_marks_all_as_read(self, mock_session, user_id) -> None:
        mock_session.execute.return_value.rowcount = 5

        count = notification_service.mark_all_read(mock_session, user_id)

        assert count == 5
        mock_session.commit.assert_called()


class TestDeleteNotification:
    def test_deletes_notification(self, mock_session, user_id) -> None:
        notification = MagicMock()
        mock_session.execute.return_value.scalar_one_or_none.return_value = notification

        result = notification_service.delete_notification(
            mock_session, uuid.uuid4(), user_id
        )

        assert result is True
        mock_session.delete.assert_called_once_with(notification)
        mock_session.commit.assert_called()

    def test_returns_false_when_not_found(self, mock_session, user_id) -> None:
        mock_session.execute.return_value.scalar_one_or_none.return_value = None

        result = notification_service.delete_notification(
            mock_session, uuid.uuid4(), user_id
        )

        assert result is False


class TestGetPreferences:
    def test_returns_defaults_for_missing_types(self, mock_session, user_id) -> None:
        mock_session.execute.return_value.scalars.return_value.all.return_value = []

        result = notification_service.get_preferences(mock_session, user_id)

        assert len(result.preferences) == len(NotificationType)
        for pref in result.preferences:
            assert pref.is_in_app_enabled is True
            assert pref.is_email_enabled is True

    def test_returns_stored_preferences(self, mock_session, user_id) -> None:
        stored_pref = MagicMock()
        stored_pref.notification_type = NotificationType.STEP_COMPLETED.value
        stored_pref.is_in_app_enabled = False
        stored_pref.is_email_enabled = True
        mock_session.execute.return_value.scalars.return_value.all.return_value = [
            stored_pref
        ]

        result = notification_service.get_preferences(mock_session, user_id)

        step_pref = next(
            p
            for p in result.preferences
            if p.notification_type == NotificationType.STEP_COMPLETED
        )
        assert step_pref.is_in_app_enabled is False
        assert step_pref.is_email_enabled is True


class TestUpdatePreferences:
    def test_upserts_preferences(self, mock_session, user_id) -> None:
        mock_session.execute.return_value.scalar_one_or_none.return_value = None
        mock_session.execute.return_value.scalars.return_value.all.return_value = []

        preferences = [
            NotificationPreferenceItem(
                notification_type=NotificationType.STEP_COMPLETED,
                is_in_app_enabled=True,
                is_email_enabled=False,
            ),
        ]

        notification_service.update_preferences(mock_session, user_id, preferences)

        mock_session.add.assert_called()
        mock_session.commit.assert_called()
