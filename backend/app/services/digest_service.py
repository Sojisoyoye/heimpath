"""Weekly digest service — builds and sends weekly progress emails."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from sqlmodel import Session, func, select

if TYPE_CHECKING:
    from app.models import User

from app.core.config import settings
from app.models.calculator import HiddenCostCalculation
from app.models.document import Document
from app.models.financing import FinancingAssessment
from app.models.legal import LawBookmark
from app.models.notification import NotificationPreference, NotificationType
from app.models.roi import ROICalculation
from app.services import dashboard_service

logger = logging.getLogger(__name__)


def send_weekly_digest(session: Session) -> int:
    """Send weekly digest emails to opted-in users with recent activity.

    Args:
        session: Database session.

    Returns:
        Number of digest emails successfully sent.
    """
    from app.models import User

    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    # Stream users in batches to avoid loading all into memory
    stmt = select(User).where(User.is_active == True).execution_options(yield_per=100)  # noqa: E712
    users = session.exec(stmt)

    sent_count = 0
    for user in users:
        if not user.email:
            continue

        # Check if user has opted out of weekly digest emails
        if not _is_digest_enabled(session, user.id):
            continue

        digest_data = _build_digest_data(session, user.id, since=one_week_ago)

        # Skip users with no activity
        if not digest_data["has_activity"]:
            continue

        try:
            _send_digest_email(user, digest_data)
            sent_count += 1
        except Exception:
            logger.exception("Failed to send weekly digest to user %s", user.id)

    logger.info("Weekly digest complete: %d emails sent", sent_count)
    return sent_count


def _is_digest_enabled(session: Session, user_id: uuid.UUID) -> bool:
    """Check whether the user has email enabled for weekly_digest (default True)."""
    stmt = select(NotificationPreference).where(
        NotificationPreference.user_id == user_id,
        NotificationPreference.notification_type
        == NotificationType.WEEKLY_DIGEST.value,
    )
    pref = session.execute(stmt).scalar_one_or_none()
    return pref.is_email_enabled if pref else True


def _build_digest_data(
    session: Session,
    user_id: uuid.UUID,
    *,
    since: datetime,
) -> dict:
    """Aggregate digest data for a user.

    Returns:
        Dict with journey_summary, recent_activity, stats, and has_activity flag.
    """
    journey_summary = _get_journey_summary(session, user_id)
    recent_activity = _get_recent_activity(session, user_id, since=since)

    docs_count = _count_since(session, Document, user_id, since)
    calcs_count = (
        _count_since(session, HiddenCostCalculation, user_id, since)
        + _count_since(session, ROICalculation, user_id, since)
        + _count_since(session, FinancingAssessment, user_id, since)
    )
    bookmarks_count = _count_since(session, LawBookmark, user_id, since)

    has_activity = (
        bool(recent_activity)
        or docs_count > 0
        or calcs_count > 0
        or bookmarks_count > 0
    )

    return {
        "journey_summary": journey_summary,
        "recent_activity": recent_activity,
        "stats": {
            "documents_translated": docs_count,
            "calculations_saved": calcs_count,
            "bookmarks_added": bookmarks_count,
        },
        "has_activity": has_activity,
    }


def _get_journey_summary(session: Session, user_id: uuid.UUID) -> dict | None:
    """Get active journey summary reusing dashboard helpers."""
    overview = dashboard_service.get_journey_overview(session, user_id)
    if not overview:
        return None
    return {
        "title": overview.title,
        "progress_percentage": overview.progress_percentage,
        "next_step": overview.next_step_title,
    }


def _get_recent_activity(
    session: Session,
    user_id: uuid.UUID,
    *,
    since: datetime,
) -> list[dict]:
    """Get recent activity items from the last week."""
    all_activity = dashboard_service.build_activity_timeline(session, user_id, limit=20)
    return [
        {"title": item.title, "description": item.description}
        for item in all_activity
        if item.timestamp and item.timestamp >= since
    ]


def _count_since(
    session: Session, model: type, user_id: uuid.UUID, since: datetime
) -> int:
    """Count rows for a model created since a given date."""
    stmt = select(func.count()).where(
        model.user_id == user_id,  # type: ignore[attr-defined]
        model.created_at >= since,  # type: ignore[attr-defined]
    )
    return session.exec(stmt).one()


def _send_digest_email(user: User, digest_data: dict) -> None:
    """Render and send the weekly digest email."""
    from app.utils import (
        generate_unsubscribe_token,
        render_email_template,
        send_email,
    )

    user_id = user.id
    user_email = user.email
    user_name = user.full_name or user_email

    token = generate_unsubscribe_token(user_id, NotificationType.WEEKLY_DIGEST.value)
    unsubscribe_url = f"{settings.FRONTEND_HOST}/unsubscribe?token={token}"
    dashboard_url = f"{settings.FRONTEND_HOST}/dashboard"

    html_content = render_email_template(
        template_name="weekly_digest.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "user_name": user_name,
            "journey_summary": digest_data["journey_summary"],
            "recent_activity": digest_data["recent_activity"],
            "stats": digest_data["stats"],
            "unsubscribe_url": unsubscribe_url,
            "dashboard_url": dashboard_url,
        },
    )

    send_email(
        email_to=user_email,
        subject=f"{settings.PROJECT_NAME} — Your Weekly Progress",
        html_content=html_content,
        unsubscribe_url=unsubscribe_url,
    )
