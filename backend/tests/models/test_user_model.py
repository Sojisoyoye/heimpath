"""Tests for User SQLAlchemy model."""
import uuid
from datetime import datetime, timezone

import pytest

from app.models import SubscriptionTier, UserV2 as User


class TestUserModel:
    """Test User SQLAlchemy model."""

    def test_user_has_required_fields(self) -> None:
        """User model should have all required fields."""
        user = User(
            email="test@example.com",
            hashed_password="hashed_password_here",
            full_name="Test User",
        )

        assert hasattr(user, "id")
        assert hasattr(user, "email")
        assert hasattr(user, "hashed_password")
        assert hasattr(user, "full_name")
        assert hasattr(user, "is_active")
        assert hasattr(user, "is_superuser")
        assert hasattr(user, "created_at")
        assert hasattr(user, "updated_at")
        assert hasattr(user, "citizenship")
        assert hasattr(user, "email_verified")
        assert hasattr(user, "subscription_tier")

    def test_user_nullable_fields_default_to_none(self) -> None:
        """Nullable fields should default to None at instantiation."""
        user = User(
            email="test@example.com",
            hashed_password="hashed_password_here",
        )

        assert user.citizenship is None
        assert user.full_name is None

    def test_user_explicit_boolean_values(self) -> None:
        """Boolean fields should accept explicit values."""
        user = User(
            email="test@example.com",
            hashed_password="hashed_password_here",
            is_active=True,
            is_superuser=False,
            email_verified=False,
        )

        assert user.is_active is True
        assert user.is_superuser is False
        assert user.email_verified is False

    def test_user_id_column_exists(self) -> None:
        """User should have id column defined."""
        assert hasattr(User, "id")
        assert User.__table__.c.id is not None
        assert User.__table__.c.id.primary_key is True

    def test_user_timestamps_columns_exist(self) -> None:
        """Timestamp columns should be defined with proper types."""
        assert hasattr(User, "created_at")
        assert hasattr(User, "updated_at")
        assert User.__table__.c.created_at is not None
        assert User.__table__.c.updated_at is not None

    def test_user_email_field(self) -> None:
        """Email field should store the email."""
        email = "test@example.com"
        user = User(
            email=email,
            hashed_password="hashed_password_here",
        )

        assert user.email == email

    def test_user_full_name_field(self) -> None:
        """Full name field should store the name."""
        full_name = "John Doe"
        user = User(
            email="test@example.com",
            hashed_password="hashed_password_here",
            full_name=full_name,
        )

        assert user.full_name == full_name

    def test_user_citizenship_field(self) -> None:
        """Citizenship field should store citizenship for personalized journeys."""
        citizenship = "German"
        user = User(
            email="test@example.com",
            hashed_password="hashed_password_here",
            citizenship=citizenship,
        )

        assert user.citizenship == citizenship

    def test_user_email_verified_field(self) -> None:
        """Email verified field should be settable."""
        user = User(
            email="test@example.com",
            hashed_password="hashed_password_here",
            email_verified=True,
        )

        assert user.email_verified is True

    def test_user_superuser_field(self) -> None:
        """Superuser field should be settable."""
        user = User(
            email="admin@example.com",
            hashed_password="hashed_password_here",
            is_superuser=True,
        )

        assert user.is_superuser is True

    def test_user_active_field(self) -> None:
        """Active field should be settable."""
        user = User(
            email="inactive@example.com",
            hashed_password="hashed_password_here",
            is_active=False,
        )

        assert user.is_active is False

    def test_user_table_name(self) -> None:
        """User should have correct table name."""
        assert User.__tablename__ == "user"

    def test_user_subscription_tier_column_has_default(self) -> None:
        """Subscription tier column should have FREE as database default."""
        column = User.__table__.c.subscription_tier
        assert column.default is not None
        assert column.default.arg == SubscriptionTier.FREE

    def test_user_subscription_tier_explicit_values(self) -> None:
        """Subscription tier should accept explicit enum values."""
        user_premium = User(
            email="premium@example.com",
            hashed_password="hashed_password_here",
            subscription_tier=SubscriptionTier.PREMIUM,
        )
        user_enterprise = User(
            email="enterprise@example.com",
            hashed_password="hashed_password_here",
            subscription_tier=SubscriptionTier.ENTERPRISE,
        )

        assert user_premium.subscription_tier == SubscriptionTier.PREMIUM
        assert user_enterprise.subscription_tier == SubscriptionTier.ENTERPRISE

    def test_subscription_tier_enum_values(self) -> None:
        """SubscriptionTier enum should have correct values."""
        assert SubscriptionTier.FREE.value == "free"
        assert SubscriptionTier.PREMIUM.value == "premium"
        assert SubscriptionTier.ENTERPRISE.value == "enterprise"
