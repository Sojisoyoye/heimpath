"""Feedback database model."""

from enum import Enum as PyEnum

from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FeedbackCategory(str, PyEnum):
    """Categories of user feedback."""

    BUG = "bug"
    FEATURE_REQUEST = "feature_request"
    IMPROVEMENT = "improvement"
    QUESTION = "question"
    OTHER = "other"


_feedback_category_enum = PgEnum(
    *(m.value for m in FeedbackCategory),
    name="feedbackcategory",
    create_type=False,
)


class Feedback(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """User feedback submission."""

    __tablename__ = "feedback"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category = Column(_feedback_category_enum, nullable=False)
    message = Column(Text, nullable=False)
    page_url = Column(String(500), nullable=True)
