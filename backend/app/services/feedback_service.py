"""Feedback service — business logic for user feedback."""

import hashlib
import hmac
import json
import logging
import uuid

import httpx
from sqlmodel import Session

from app.core.config import settings
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.feedback import FeedbackCreate
from app.utils import send_email

logger = logging.getLogger(__name__)


def create_feedback(
    session: Session, user_id: uuid.UUID, data: FeedbackCreate
) -> Feedback:
    """Store and notify (synchronous, kept for backwards-compat)."""
    feedback = create_feedback_sync(session, user_id, data)
    user = session.get(User, user_id)
    notify_feedback(feedback, user.email if user else str(user_id))
    return feedback


def create_feedback_sync(
    session: Session, user_id: uuid.UUID, data: FeedbackCreate
) -> Feedback:
    """Store a feedback submission and return it (no side effects)."""
    feedback = Feedback(
        user_id=user_id,
        category=data.category,
        message=data.message,
        page_url=data.page_url,
    )
    session.add(feedback)
    session.commit()
    session.refresh(feedback)
    return feedback


def notify_feedback(feedback: Feedback, user_identifier: str) -> None:
    """Send email + GrowthOS webhook notifications. Safe to call in background."""
    _notify_email(feedback, user_identifier)
    _notify_growthos(feedback, user_identifier)


def _notify_email(feedback: Feedback, user_identifier: str) -> None:
    """Fire-and-forget email notification to the admin inbox."""
    try:
        category_label = (feedback.category or "other").replace("_", " ").title()
        subject = f"[HeimPath Feedback] {category_label} — {feedback.message[:50]}"
        body = (
            f"New feedback submitted via HeimPath\n\n"
            f"Category: {category_label}\n"
            f"User: {user_identifier}\n"
            f"Page: {feedback.page_url or 'unknown'}\n\n"
            f"Message:\n{feedback.message}\n\n"
            f"---\nFeedback ID: {feedback.id}"
        )
        if settings.emails_enabled:
            send_email(
                email_to=settings.FIRST_SUPERUSER,
                subject=subject,
                html_content=f"<pre>{body}</pre>",
            )
    except Exception:
        logger.exception("Feedback email notification failed — feedback is saved to DB")


def _notify_growthos(feedback: Feedback, user_identifier: str) -> None:
    """Fire-and-forget webhook to GrowthOS feedback inbox."""
    if not settings.GROWTHOS_API_URL:
        return
    secret = settings.GROWTHOS_WEBHOOK_SECRET or ""
    try:
        payload = {
            "category": str(feedback.category or "other"),
            "message": feedback.message,
            "userIdentifier": user_identifier,
            "submittedAt": feedback.created_at.isoformat()
            if feedback.created_at
            else None,
        }
        body = json.dumps(payload).encode()
        signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        with httpx.Client(timeout=3.0) as client:
            response = client.post(
                f"{settings.GROWTHOS_API_URL}/api/feedback-webhook",
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "x-hub-signature-256": f"sha256={signature}",
                },
            )
            response.raise_for_status()
    except Exception:
        logger.warning("GrowthOS feedback webhook failed — feedback is saved to DB")
