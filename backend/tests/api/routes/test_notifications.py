"""Tests for Notification API endpoints."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate
from app.models.notification import Notification, NotificationType
from tests.utils.utils import random_email, random_lower_string


def get_auth_headers(
    client: TestClient, db: Session
) -> tuple[dict[str, str], uuid.UUID]:
    """Create a user and return auth headers and user ID."""
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    return headers, user.id


def create_notification(db: Session, user_id: uuid.UUID, **kwargs) -> Notification:
    """Helper to insert a notification directly into the DB."""
    notification = Notification(
        user_id=user_id,
        type=kwargs.get("type", NotificationType.STEP_COMPLETED.value),
        title=kwargs.get("title", "Test Notification"),
        message=kwargs.get("message", "This is a test notification"),
        is_read=kwargs.get("is_read", False),
        action_url=kwargs.get("action_url"),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def test_list_notifications_empty(client: TestClient, db: Session) -> None:
    """Test listing notifications returns empty for new user."""
    headers, _ = get_auth_headers(client, db)

    r = client.get(f"{settings.API_V1_STR}/notifications/", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 0
    assert data["unread_count"] == 0
    assert data["data"] == []


def test_list_notifications_with_data(client: TestClient, db: Session) -> None:
    """Test listing notifications returns user's notifications."""
    headers, user_id = get_auth_headers(client, db)
    create_notification(db, user_id, title="First")
    create_notification(db, user_id, title="Second", is_read=True)

    r = client.get(f"{settings.API_V1_STR}/notifications/", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 2
    assert data["unread_count"] == 1


def test_list_notifications_unread_only(client: TestClient, db: Session) -> None:
    """Test filtering for unread-only notifications."""
    headers, user_id = get_auth_headers(client, db)
    create_notification(db, user_id, title="Unread")
    create_notification(db, user_id, title="Read", is_read=True)

    r = client.get(
        f"{settings.API_V1_STR}/notifications/?unread_only=true",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert data["data"][0]["title"] == "Unread"


def test_list_notifications_unauthenticated(client: TestClient) -> None:
    """Test that unauthenticated requests are rejected."""
    r = client.get(f"{settings.API_V1_STR}/notifications/")
    assert r.status_code == 401


def test_mark_notification_read(client: TestClient, db: Session) -> None:
    """Test marking a single notification as read."""
    headers, user_id = get_auth_headers(client, db)
    notification = create_notification(db, user_id)

    r = client.put(
        f"{settings.API_V1_STR}/notifications/{notification.id}/read",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["is_read"] is True


def test_mark_notification_read_not_found(client: TestClient, db: Session) -> None:
    """Test marking a non-existent notification returns 404."""
    headers, _ = get_auth_headers(client, db)
    fake_id = uuid.uuid4()

    r = client.put(
        f"{settings.API_V1_STR}/notifications/{fake_id}/read",
        headers=headers,
    )

    assert r.status_code == 404


def test_mark_notification_read_user_isolation(client: TestClient, db: Session) -> None:
    """Test that users can't mark other users' notifications as read."""
    headers1, user_id1 = get_auth_headers(client, db)
    headers2, _ = get_auth_headers(client, db)
    notification = create_notification(db, user_id1)

    r = client.put(
        f"{settings.API_V1_STR}/notifications/{notification.id}/read",
        headers=headers2,
    )

    assert r.status_code == 404


def test_mark_all_read(client: TestClient, db: Session) -> None:
    """Test marking all notifications as read."""
    headers, user_id = get_auth_headers(client, db)
    create_notification(db, user_id, title="N1")
    create_notification(db, user_id, title="N2")

    r = client.put(
        f"{settings.API_V1_STR}/notifications/mark-all-read",
        headers=headers,
    )

    assert r.status_code == 200

    # Verify all are read
    r2 = client.get(
        f"{settings.API_V1_STR}/notifications/?unread_only=true",
        headers=headers,
    )
    assert r2.json()["count"] == 0


def test_delete_notification(client: TestClient, db: Session) -> None:
    """Test deleting a notification."""
    headers, user_id = get_auth_headers(client, db)
    notification = create_notification(db, user_id)

    r = client.delete(
        f"{settings.API_V1_STR}/notifications/{notification.id}",
        headers=headers,
    )

    assert r.status_code == 204


def test_delete_notification_not_found(client: TestClient, db: Session) -> None:
    """Test deleting a non-existent notification returns 404."""
    headers, _ = get_auth_headers(client, db)
    fake_id = uuid.uuid4()

    r = client.delete(
        f"{settings.API_V1_STR}/notifications/{fake_id}",
        headers=headers,
    )

    assert r.status_code == 404


def test_get_preferences(client: TestClient, db: Session) -> None:
    """Test getting notification preferences returns defaults."""
    headers, _ = get_auth_headers(client, db)

    r = client.get(
        f"{settings.API_V1_STR}/notifications/preferences",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert len(data["preferences"]) == len(NotificationType)
    for pref in data["preferences"]:
        assert pref["is_in_app_enabled"] is True
        assert pref["is_email_enabled"] is True


def test_update_preferences(client: TestClient, db: Session) -> None:
    """Test updating notification preferences."""
    headers, _ = get_auth_headers(client, db)

    r = client.put(
        f"{settings.API_V1_STR}/notifications/preferences",
        headers=headers,
        json={
            "preferences": [
                {
                    "notification_type": "step_completed",
                    "is_in_app_enabled": True,
                    "is_email_enabled": False,
                },
            ]
        },
    )

    assert r.status_code == 200
    data = r.json()
    step_pref = next(
        p for p in data["preferences"] if p["notification_type"] == "step_completed"
    )
    assert step_pref["is_in_app_enabled"] is True
    assert step_pref["is_email_enabled"] is False
