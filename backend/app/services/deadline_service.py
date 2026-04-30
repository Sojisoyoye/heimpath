"""Deadline reminder service — sends JOURNEY_DEADLINE notifications at key milestones.

Run via CLI:
    python -m app.cli send-deadline-reminders

Milestones (days before target_purchase_date): 90, 30, 7, 1.
A notification is skipped if an identical one was already sent within
the last two days (deduplication window).
"""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlmodel import Session, select

from app.models.journey import Journey
from app.models.notification import Notification, NotificationType

logger = logging.getLogger(__name__)

# Days before the target date at which reminders are fired.
REMINDER_MILESTONES: tuple[int, ...] = (90, 30, 7, 1)

# If a matching reminder was created within this window, skip to avoid duplicates.
_DEDUP_WINDOW_DAYS = 2


def send_deadline_reminders(session: Session) -> int:
    """Send JOURNEY_DEADLINE notifications for journeys approaching their target date.

    Iterates all journeys with a future target_purchase_date, checks whether
    today is a milestone day, and creates an in-app (plus optional email)
    notification if one hasn't already been sent for this milestone.

    Args:
        session: Synchronous database session.

    Returns:
        Number of notifications created.
    """
    today = datetime.now(timezone.utc).date()
    sent_count = 0

    for journey in _get_journeys_with_upcoming_deadline(session, today):
        target_date = journey.target_purchase_date.date()
        days_remaining = (target_date - today).days

        if days_remaining not in REMINDER_MILESTONES:
            continue

        action_url = f"/journeys/{journey.id}"

        if _already_notified(session, journey.user_id, action_url):
            logger.debug(
                "Skipping duplicate deadline reminder for journey %s (%d days)",
                journey.id,
                days_remaining,
            )
            continue

        _create_reminder(session, journey, days_remaining, action_url)
        sent_count += 1

    logger.info("Deadline reminders complete: %d notifications created.", sent_count)
    return sent_count


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _get_journeys_with_upcoming_deadline(
    session: Session, today: date
) -> list[Journey]:
    """Return all journeys whose target_purchase_date is today or in the future."""
    today_start = datetime.combine(today, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )
    stmt = select(Journey).where(
        Journey.target_purchase_date.is_not(None),  # type: ignore[union-attr]
        Journey.target_purchase_date >= today_start,  # type: ignore[operator]
    )
    return list(session.exec(stmt).all())


def _already_notified(
    session: Session, user_id: uuid.UUID, action_url: str
) -> bool:
    """Return True if a JOURNEY_DEADLINE notification for this action_url was
    created within the deduplication window."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=_DEDUP_WINDOW_DAYS)
    stmt = select(Notification).where(
        Notification.user_id == user_id,
        Notification.type == NotificationType.JOURNEY_DEADLINE.value,
        Notification.action_url == action_url,
        Notification.created_at >= cutoff,
    )
    return session.execute(stmt).scalar_one_or_none() is not None


def _create_reminder(
    session: Session,
    journey: Journey,
    days_remaining: int,
    action_url: str,
) -> None:
    """Create the deadline reminder notification via the notification service."""
    from app.services import notification_service

    day_word = "day" if days_remaining == 1 else "days"
    title = f"Journey deadline in {days_remaining} {day_word}"
    message = _build_message(days_remaining)

    notification_service.create_notification(
        session,
        user_id=journey.user_id,
        type=NotificationType.JOURNEY_DEADLINE,
        title=title,
        message=message,
        action_url=action_url,
    )


def _build_message(days_remaining: int) -> str:
    """Return a milestone-specific reminder message."""
    if days_remaining == 1:
        return (
            "Your target purchase date is tomorrow. "
            "Ensure all documents are signed and your notary is confirmed."
        )
    if days_remaining == 7:
        return (
            "One week until your target purchase date. "
            "Confirm your notary appointment and review your mortgage offer."
        )
    if days_remaining == 30:
        return (
            "30 days until your target purchase date. "
            "Time to finalise your mortgage offer and check all purchase documents."
        )
    # 90 days
    return (
        f"{days_remaining} days until your target purchase date. "
        "A good time to schedule your notary appointment and confirm your financing."
    )
