"""User database model."""
from enum import Enum as PyEnum

from sqlalchemy import Boolean, Column, Enum, String
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class SubscriptionTier(str, PyEnum):
    """User subscription tier levels."""

    FREE = "free"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    User database model for HeimPath.

    Stores user account information including authentication details
    and profile data for personalized journeys.
    """

    __tablename__ = "user"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    citizenship = Column(String(50), nullable=True)
    subscription_tier = Column(
        Enum(SubscriptionTier, values_callable=lambda x: [e.value for e in x]),
        default=SubscriptionTier.FREE,
        nullable=False,
    )

    items = relationship(
        "Item",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
