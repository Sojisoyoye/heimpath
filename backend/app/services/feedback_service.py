"""Feedback service — business logic for user feedback."""

import uuid

from sqlmodel import Session

from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate


def create_feedback(
    session: Session, user_id: uuid.UUID, data: FeedbackCreate
) -> Feedback:
    """Store a feedback submission."""
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
