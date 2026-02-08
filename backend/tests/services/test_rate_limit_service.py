"""Tests for Login Rate Limiter Service."""
from datetime import datetime, timedelta, timezone

import pytest

from app.services.rate_limit_service import LoginRateLimiter, RateLimitInfo


class TestRateLimitInfo:
    """Test RateLimitInfo named tuple."""

    def test_rate_limit_info_creation(self) -> None:
        """Should create RateLimitInfo with all fields."""
        info = RateLimitInfo(
            is_locked=False,
            attempts_remaining=5,
            lockout_expires_at=None,
        )

        assert info.is_locked is False
        assert info.attempts_remaining == 5
        assert info.lockout_expires_at is None

    def test_rate_limit_info_locked(self) -> None:
        """Should represent locked state correctly."""
        expires = datetime.now(timezone.utc) + timedelta(minutes=15)
        info = RateLimitInfo(
            is_locked=True,
            attempts_remaining=0,
            lockout_expires_at=expires,
        )

        assert info.is_locked is True
        assert info.attempts_remaining == 0
        assert info.lockout_expires_at == expires


class TestLoginRateLimiter:
    """Test LoginRateLimiter functionality."""

    @pytest.fixture
    def rate_limiter(self) -> LoginRateLimiter:
        """Create fresh rate limiter for each test."""
        return LoginRateLimiter()

    def test_initial_status_not_locked(self, rate_limiter: LoginRateLimiter) -> None:
        """New identifier should not be locked."""
        status = rate_limiter.get_status("test@example.com")

        assert status.is_locked is False
        assert status.attempts_remaining == 5

    def test_record_single_failed_attempt(
        self, rate_limiter: LoginRateLimiter
    ) -> None:
        """Single failed attempt should decrement remaining attempts."""
        status = rate_limiter.record_failed_attempt("test@example.com")

        assert status.is_locked is False
        assert status.attempts_remaining == 4

    def test_record_multiple_failed_attempts(
        self, rate_limiter: LoginRateLimiter
    ) -> None:
        """Multiple failed attempts should decrement correctly."""
        email = "test@example.com"

        rate_limiter.record_failed_attempt(email)
        rate_limiter.record_failed_attempt(email)
        status = rate_limiter.record_failed_attempt(email)

        assert status.is_locked is False
        assert status.attempts_remaining == 2

    def test_lockout_after_max_attempts(
        self, rate_limiter: LoginRateLimiter
    ) -> None:
        """Should lock after MAX_ATTEMPTS (5) failed attempts."""
        email = "test@example.com"

        # Make 4 failed attempts
        for _ in range(4):
            status = rate_limiter.record_failed_attempt(email)
            assert status.is_locked is False

        # 5th attempt should trigger lockout
        status = rate_limiter.record_failed_attempt(email)

        assert status.is_locked is True
        assert status.attempts_remaining == 0
        assert status.lockout_expires_at is not None

    def test_is_locked_returns_true_when_locked(
        self, rate_limiter: LoginRateLimiter
    ) -> None:
        """is_locked should return True for locked identifier."""
        email = "test@example.com"

        # Trigger lockout
        for _ in range(5):
            rate_limiter.record_failed_attempt(email)

        assert rate_limiter.is_locked(email) is True

    def test_is_locked_returns_false_when_not_locked(
        self, rate_limiter: LoginRateLimiter
    ) -> None:
        """is_locked should return False for non-locked identifier."""
        assert rate_limiter.is_locked("test@example.com") is False

    def test_lockout_duration_is_15_minutes(
        self, rate_limiter: LoginRateLimiter
    ) -> None:
        """Lockout should expire after 15 minutes."""
        email = "test@example.com"

        # Trigger lockout
        for _ in range(5):
            rate_limiter.record_failed_attempt(email)

        status = rate_limiter.get_status(email)

        assert status.lockout_expires_at is not None
        expected_duration = timedelta(minutes=15)
        actual_duration = status.lockout_expires_at - datetime.now(timezone.utc)

        # Allow 1 second tolerance
        assert actual_duration > expected_duration - timedelta(seconds=1)
        assert actual_duration <= expected_duration

    def test_successful_login_clears_attempts(
        self, rate_limiter: LoginRateLimiter
    ) -> None:
        """Successful login should clear failed attempts."""
        email = "test@example.com"

        # Make some failed attempts
        rate_limiter.record_failed_attempt(email)
        rate_limiter.record_failed_attempt(email)

        # Successful login
        rate_limiter.record_successful_login(email)

        # Should be back to full attempts
        status = rate_limiter.get_status(email)
        assert status.attempts_remaining == 5

    def test_different_identifiers_tracked_separately(
        self, rate_limiter: LoginRateLimiter
    ) -> None:
        """Different identifiers should have separate tracking."""
        email1 = "user1@example.com"
        email2 = "user2@example.com"

        # Lock out user1
        for _ in range(5):
            rate_limiter.record_failed_attempt(email1)

        # user2 should not be affected
        assert rate_limiter.is_locked(email1) is True
        assert rate_limiter.is_locked(email2) is False
        assert rate_limiter.get_status(email2).attempts_remaining == 5

    def test_reset_clears_lockout(
        self, rate_limiter: LoginRateLimiter
    ) -> None:
        """Admin reset should clear lockout."""
        email = "test@example.com"

        # Trigger lockout
        for _ in range(5):
            rate_limiter.record_failed_attempt(email)

        assert rate_limiter.is_locked(email) is True

        # Reset
        rate_limiter.reset(email)

        assert rate_limiter.is_locked(email) is False
        assert rate_limiter.get_status(email).attempts_remaining == 5

    def test_record_failed_attempt_when_already_locked(
        self, rate_limiter: LoginRateLimiter
    ) -> None:
        """Recording attempt when locked should return locked status."""
        email = "test@example.com"

        # Trigger lockout
        for _ in range(5):
            rate_limiter.record_failed_attempt(email)

        # Try another attempt while locked
        status = rate_limiter.record_failed_attempt(email)

        assert status.is_locked is True
        assert status.attempts_remaining == 0
