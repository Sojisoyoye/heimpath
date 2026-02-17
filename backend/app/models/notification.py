"""Notification database models."""

from enum import Enum as PyEnum

from sqlalchemy import Boolean, Column, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class NotificationType(str, PyEnum):
    """Types of notifications."""

    STEP_COMPLETED = "step_completed"
    DOCUMENT_TRANSLATED = "document_translated"
    CALCULATION_SAVED = "calculation_saved"
    LAW_BOOKMARKED = "law_bookmarked"
    JOURNEY_DEADLINE = "journey_deadline"
    PAYMENT_REMINDER = "payment_reminder"
    SUBSCRIPTION_EXPIRING = "subscription_expiring"
    SYSTEM_ANNOUNCEMENT = "system_announcement"


_notification_type_enum = PgEnum(
    "step_completed",
    "document_translated",
    "calculation_saved",
    "law_bookmarked",
    "journey_deadline",
    "payment_reminder",
    "subscription_expiring",
    "system_announcement",
    name="notificationtype",
    create_type=False,
)


class Notification(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """In-app notification for a user."""

    __tablename__ = "notification"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(_notification_type_enum, nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    action_url = Column(String(500), nullable=True)


class NotificationPreference(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-type notification preferences for a user."""

    __tablename__ = "notification_preference"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "notification_type", name="uq_user_notification_type"
        ),
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    notification_type = Column(_notification_type_enum, nullable=False)
    is_in_app_enabled = Column(Boolean, default=True, nullable=False)
    is_email_enabled = Column(Boolean, default=True, nullable=False)
