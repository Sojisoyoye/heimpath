"""Notification service — module-level functions for notification CRUD and preferences."""

import logging
import uuid

from sqlalchemy import func, select, update
from sqlmodel import Session

from app.core.config import settings
from app.models.notification import (
    Notification,
    NotificationPreference,
    NotificationType,
)
from app.schemas.notification import (
    NotificationListResponse,
    NotificationPreferenceItem,
    NotificationPreferencesResponse,
    NotificationResponse,
)

logger = logging.getLogger(__name__)


def create_notification(
    session: Session,
    *,
    user_id: uuid.UUID,
    type: NotificationType,
    title: str,
    message: str,
    action_url: str | None = None,
) -> Notification | None:
    """Create a notification if the user's in-app preference allows it.

    Also sends an email notification if the user's email preference is enabled.
    Returns the created Notification or None if in-app was disabled.
    """
    pref = _get_preference(session, user_id, type)
    is_in_app_enabled = pref.is_in_app_enabled if pref else True
    is_email_enabled = pref.is_email_enabled if pref else True

    notification = None
    if is_in_app_enabled:
        notification = Notification(
            user_id=user_id,
            type=type.value,
            title=title,
            message=message,
            action_url=action_url,
        )
        session.add(notification)
        session.commit()
        session.refresh(notification)

    if is_email_enabled:
        _send_notification_email(session, user_id, title, message, action_url)

    return notification


def get_notifications(
    session: Session,
    user_id: uuid.UUID,
    *,
    limit: int = 20,
    offset: int = 0,
    unread_only: bool = False,
) -> NotificationListResponse:
    """Get paginated notifications for a user."""
    base_filter = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        base_filter = base_filter.where(Notification.is_read == False)  # noqa: E712

    # Total count matching filter
    count_stmt = select(func.count()).select_from(base_filter.subquery())
    count = session.execute(count_stmt).scalar() or 0

    # Unread count (always unfiltered)
    unread_stmt = select(func.count()).where(
        Notification.user_id == user_id,
        Notification.is_read == False,  # noqa: E712
    )
    unread_count = session.execute(unread_stmt).scalar() or 0

    # Fetch page
    stmt = (
        base_filter.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    )
    notifications = session.execute(stmt).scalars().all()

    return NotificationListResponse(
        data=[
            NotificationResponse(
                id=n.id,
                type=n.type,
                title=n.title,
                message=n.message,
                is_read=n.is_read,
                action_url=n.action_url,
                created_at=n.created_at,
            )
            for n in notifications
        ],
        count=count,
        unread_count=unread_count,
    )


def get_unread_count(session: Session, user_id: uuid.UUID) -> int:
    """Return number of unread notifications for a user."""
    stmt = select(func.count()).where(
        Notification.user_id == user_id,
        Notification.is_read == False,  # noqa: E712
    )
    return session.execute(stmt).scalar() or 0


def mark_as_read(
    session: Session,
    notification_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Notification | None:
    """Mark a single notification as read. Returns None if not found."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    )
    notification = session.execute(stmt).scalar_one_or_none()
    if not notification:
        return None

    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


def mark_all_read(session: Session, user_id: uuid.UUID) -> int:
    """Mark all unread notifications as read. Returns count of updated rows."""
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read == False,  # noqa: E712
        )
        .values(is_read=True)
    )
    result = session.execute(stmt)
    session.commit()
    return result.rowcount  # type: ignore[return-value]


def delete_notification(
    session: Session,
    notification_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    """Delete a notification. Returns True if deleted, False if not found."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    )
    notification = session.execute(stmt).scalar_one_or_none()
    if not notification:
        return False

    session.delete(notification)
    session.commit()
    return True


def get_preferences(
    session: Session,
    user_id: uuid.UUID,
) -> NotificationPreferencesResponse:
    """Get user preferences, returning defaults for missing types."""
    stmt = select(NotificationPreference).where(
        NotificationPreference.user_id == user_id
    )
    existing = session.execute(stmt).scalars().all()
    existing_map = {p.notification_type: p for p in existing}

    items = []
    for nt in NotificationType:
        pref = existing_map.get(nt.value)
        items.append(
            NotificationPreferenceItem(
                notification_type=nt,
                is_in_app_enabled=pref.is_in_app_enabled if pref else True,
                is_email_enabled=pref.is_email_enabled if pref else True,
            )
        )

    return NotificationPreferencesResponse(preferences=items)


def update_preferences(
    session: Session,
    user_id: uuid.UUID,
    preferences: list[NotificationPreferenceItem],
) -> NotificationPreferencesResponse:
    """Upsert notification preferences for the given types."""
    for item in preferences:
        stmt = select(NotificationPreference).where(
            NotificationPreference.user_id == user_id,
            NotificationPreference.notification_type == item.notification_type.value,
        )
        existing = session.execute(stmt).scalar_one_or_none()

        if existing:
            existing.is_in_app_enabled = item.is_in_app_enabled
            existing.is_email_enabled = item.is_email_enabled
            session.add(existing)
        else:
            pref = NotificationPreference(
                user_id=user_id,
                notification_type=item.notification_type.value,
                is_in_app_enabled=item.is_in_app_enabled,
                is_email_enabled=item.is_email_enabled,
            )
            session.add(pref)

    session.commit()
    return get_preferences(session, user_id)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _get_preference(
    session: Session,
    user_id: uuid.UUID,
    notification_type: NotificationType,
) -> NotificationPreference | None:
    """Fetch a single preference row, or None (meaning defaults apply)."""
    stmt = select(NotificationPreference).where(
        NotificationPreference.user_id == user_id,
        NotificationPreference.notification_type == notification_type.value,
    )
    return session.execute(stmt).scalar_one_or_none()


def _send_notification_email(
    session: Session,
    user_id: uuid.UUID,
    title: str,
    message: str,
    action_url: str | None,
) -> None:
    """Send an email notification. Fails silently with logging."""
    try:
        if not settings.emails_enabled:
            return

        from app.models import User

        user = session.get(User, user_id)
        if not user or not user.email:
            return

        from app.utils import send_email

        action_link = ""
        if action_url:
            action_link = f'<p><a href="{action_url}">View details</a></p>'

        html_content = f"<h2>{title}</h2><p>{message}</p>{action_link}"

        send_email(
            email_to=user.email,
            subject=f"HeimPath: {title}",
            html_content=html_content,
        )
    except Exception:
        logger.exception("Failed to send notification email to user %s", user_id)
