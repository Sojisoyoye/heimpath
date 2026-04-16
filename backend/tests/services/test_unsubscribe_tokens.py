"""Tests for unsubscribe token generation and verification."""

import uuid

import pytest

from app.utils import generate_unsubscribe_token, verify_unsubscribe_token


@pytest.fixture
def user_id():
    return uuid.uuid4()


class TestGenerateUnsubscribeToken:
    def test_returns_non_empty_string(self, user_id) -> None:
        token = generate_unsubscribe_token(user_id, "step_completed")
        assert isinstance(token, str)
        assert len(token) > 0

    def test_different_types_produce_different_tokens(self, user_id) -> None:
        token1 = generate_unsubscribe_token(user_id, "step_completed")
        token2 = generate_unsubscribe_token(user_id, "weekly_digest")
        assert token1 != token2


class TestVerifyUnsubscribeToken:
    def test_valid_token_returns_claims(self, user_id) -> None:
        token = generate_unsubscribe_token(user_id, "weekly_digest")
        claims = verify_unsubscribe_token(token)

        assert claims is not None
        assert claims["user_id"] == str(user_id)
        assert claims["notification_type"] == "weekly_digest"

    def test_invalid_token_returns_none(self) -> None:
        assert verify_unsubscribe_token("invalid.token.here") is None

    def test_empty_token_returns_none(self) -> None:
        assert verify_unsubscribe_token("") is None

    def test_token_with_wrong_purpose_returns_none(self, user_id) -> None:
        """A password-reset token should not pass unsubscribe verification."""
        from app.utils import generate_password_reset_token

        email = "test@example.com"
        token = generate_password_reset_token(email)
        assert verify_unsubscribe_token(token) is None

    def test_expired_token_returns_none(self, user_id) -> None:
        """Verify that an expired token is rejected."""
        from datetime import datetime, timedelta, timezone

        import jwt

        from app.core import security
        from app.core.config import settings

        past = datetime.now(timezone.utc) - timedelta(days=1)
        payload = {
            "exp": past.timestamp(),
            "nbf": past - timedelta(days=2),
            "sub": str(user_id),
            "type": "weekly_digest",
            "purpose": "unsubscribe",
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=security.ALGORITHM)

        assert verify_unsubscribe_token(token) is None
