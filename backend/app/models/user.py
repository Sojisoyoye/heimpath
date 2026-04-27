"""User database model."""

from enum import Enum as PyEnum

from sqlalchemy import Boolean, Column, Enum, String, Text
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
    stripe_customer_id = Column(String(255), nullable=True, unique=True, index=True)
    stripe_subscription_id = Column(String(255), nullable=True, unique=True)
    avatar_url = Column(Text, nullable=True)

    journeys = relationship(
        "Journey",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    law_bookmarks = relationship(
        "LawBookmark",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    contract_analyses = relationship(
        "ContractAnalysis",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    saved_professionals = relationship(
        "SavedProfessional",
        back_populates="user",
        cascade="all, delete-orphan",
    )
