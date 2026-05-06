"""AuditLog database model for tracking security-relevant actions."""

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AuditLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Immutable audit trail for user and system actions.

    Records are written fire-and-forget by audit_service.log_action().
    Rows survive user deletion via SET NULL on user_id (regulatory
    requirement — audit history must not be destroyed when an account
    is removed).
    """

    __tablename__ = "audit_log"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Action name — e.g. "document.upload", "payment.checkout_created"
    action = Column(String(100), nullable=False, index=True)

    # Optional resource context
    resource_type = Column(String(50), nullable=True, index=True)
    resource_id = Column(String(100), nullable=True)

    # Request metadata
    ip_address = Column(String(45), nullable=True)  # IPv6 max 45 chars
    request_id = Column(String(36), nullable=True)

    # Outcome — "success" | "failure"
    status = Column(String(20), nullable=False, default="success")

    # Arbitrary extra payload (userAgent, tier, etc.)
    extra_data = Column(JSONB, nullable=True)
