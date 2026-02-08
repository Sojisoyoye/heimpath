"""Tests for Email Verification Service."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.services.email_verification_service import (
    EmailVerificationService,
    VerificationToken,
)


class TestVerificationToken:
    """Test VerificationToken named tuple."""

    def test_verification_token_creation(self) -> None:
        """Should create VerificationToken with all fields."""
        now = datetime.now(timezone.utc)
        token = VerificationToken(
            token="abc123",
            user_id="user-123",
            email="test@example.com",
            expires_at=now + timedelta(hours=24),
            created_at=now,
        )

        assert token.token == "abc123"
        assert token.user_id == "user-123"
        assert token.email == "test@example.com"
        assert token.expires_at > now
        assert token.created_at == now


class TestEmailVerificationService:
    """Test EmailVerificationService functionality."""

    @pytest.fixture
    def service(self) -> EmailVerificationService:
        """Create fresh service for each test."""
        return EmailVerificationService()

    @pytest.fixture
    def user_id(self) -> str:
        """Sample user ID for testing."""
        return str(uuid.uuid4())

    def test_generate_token(
        self, service: EmailVerificationService, user_id: str
    ) -> None:
        """Should generate a verification token."""
        token = service.generate_token(user_id, "test@example.com")

        assert token is not None
        assert token.token is not None
        assert len(token.token) == 64  # 32 bytes = 64 hex chars
        assert token.user_id == user_id
        assert token.email == "test@example.com"

    def test_generate_token_sets_expiry(
        self, service: EmailVerificationService, user_id: str
    ) -> None:
        """Token should expire in 24 hours."""
        token = service.generate_token(user_id, "test@example.com")
        now = datetime.now(timezone.utc)

        time_diff = token.expires_at - now
        assert timedelta(hours=23) < time_diff < timedelta(hours=25)

    def test_generate_token_invalidates_previous(
        self, service: EmailVerificationService, user_id: str
    ) -> None:
        """Generating new token should invalidate previous one."""
        token1 = service.generate_token(user_id, "test@example.com")
        token2 = service.generate_token(user_id, "test@example.com")

        # First token should be invalid
        assert service.verify_token(token1.token) is None
        # Second token should be valid
        assert service.verify_token(token2.token) is not None

    def test_verify_token_valid(
        self, service: EmailVerificationService, user_id: str
    ) -> None:
        """Should verify valid token."""
        generated = service.generate_token(user_id, "test@example.com")
        verified = service.verify_token(generated.token)

        assert verified is not None
        assert verified.user_id == user_id
        assert verified.email == "test@example.com"

    def test_verify_token_invalid(
        self, service: EmailVerificationService
    ) -> None:
        """Should return None for invalid token."""
        result = service.verify_token("invalid-token")

        assert result is None

    def test_verify_token_expired(
        self, service: EmailVerificationService, user_id: str
    ) -> None:
        """Should return None for expired token."""
        # Generate token
        token = service.generate_token(user_id, "test@example.com")

        # Manually expire it by modifying the stored token
        expired_token = VerificationToken(
            token=token.token,
            user_id=token.user_id,
            email=token.email,
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            created_at=token.created_at,
        )
        service._tokens[token.token] = expired_token

        result = service.verify_token(token.token)

        assert result is None

    def test_verify_does_not_consume_token(
        self, service: EmailVerificationService, user_id: str
    ) -> None:
        """verify_token should not consume the token."""
        generated = service.generate_token(user_id, "test@example.com")

        # Verify multiple times
        result1 = service.verify_token(generated.token)
        result2 = service.verify_token(generated.token)

        assert result1 is not None
        assert result2 is not None

    def test_consume_token_valid(
        self, service: EmailVerificationService, user_id: str
    ) -> None:
        """Should consume valid token and return data."""
        generated = service.generate_token(user_id, "test@example.com")
        consumed = service.consume_token(generated.token)

        assert consumed is not None
        assert consumed.user_id == user_id

    def test_consume_token_removes_token(
        self, service: EmailVerificationService, user_id: str
    ) -> None:
        """Consumed token should not be usable again."""
        generated = service.generate_token(user_id, "test@example.com")
        service.consume_token(generated.token)

        # Token should be gone
        assert service.verify_token(generated.token) is None
        assert service.consume_token(generated.token) is None

    def test_consume_token_invalid(
        self, service: EmailVerificationService
    ) -> None:
        """Should return None for invalid token."""
        result = service.consume_token("invalid-token")

        assert result is None

    def test_get_token_for_user(
        self, service: EmailVerificationService, user_id: str
    ) -> None:
        """Should retrieve current token for user."""
        generated = service.generate_token(user_id, "test@example.com")
        retrieved = service.get_token_for_user(user_id)

        assert retrieved is not None
        assert retrieved.token == generated.token

    def test_get_token_for_user_not_found(
        self, service: EmailVerificationService
    ) -> None:
        """Should return None for user without token."""
        result = service.get_token_for_user("nonexistent-user")

        assert result is None

    def test_invalidate_user_tokens(
        self, service: EmailVerificationService, user_id: str
    ) -> None:
        """Should invalidate all tokens for user."""
        generated = service.generate_token(user_id, "test@example.com")
        service.invalidate_user_tokens(user_id)

        assert service.verify_token(generated.token) is None
        assert service.get_token_for_user(user_id) is None

    def test_different_users_separate_tokens(
        self, service: EmailVerificationService
    ) -> None:
        """Different users should have separate tokens."""
        user1_id = str(uuid.uuid4())
        user2_id = str(uuid.uuid4())

        token1 = service.generate_token(user1_id, "user1@example.com")
        token2 = service.generate_token(user2_id, "user2@example.com")

        # Both tokens should be valid
        assert service.verify_token(token1.token) is not None
        assert service.verify_token(token2.token) is not None

        # Invalidating one should not affect the other
        service.invalidate_user_tokens(user1_id)
        assert service.verify_token(token1.token) is None
        assert service.verify_token(token2.token) is not None

    def test_token_is_cryptographically_random(
        self, service: EmailVerificationService, user_id: str
    ) -> None:
        """Generated tokens should be unique."""
        tokens = set()
        for _ in range(100):
            token = service.generate_token(user_id, "test@example.com")
            tokens.add(token.token)

        # All 100 tokens should be unique
        assert len(tokens) == 100
