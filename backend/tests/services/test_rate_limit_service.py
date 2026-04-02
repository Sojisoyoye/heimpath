"""Tests for rate limit service module-level functions."""

from datetime import datetime, timedelta, timezone

import fakeredis
import pytest

from app.services.rate_limit_service import (
    RateLimitInfo,
    get_status,
    is_locked,
    record_failed_attempt,
    record_successful_login,
    reset,
)


@pytest.fixture(autouse=True)
def fake_redis_client(monkeypatch: pytest.MonkeyPatch) -> fakeredis.FakeRedis:
    """Replace the Redis client with an isolated in-memory fake for every test."""
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr("app.services.rate_limit_service._redis_client", fake)
    return fake


# ── RateLimitInfo ─────────────────────────────────────────────────────────────


class TestRateLimitInfo:
    def test_creation(self) -> None:
        info = RateLimitInfo(
            is_locked=False, attempts_remaining=5, lockout_expires_at=None
        )
        assert info.is_locked is False
        assert info.attempts_remaining == 5
        assert info.lockout_expires_at is None

    def test_locked_state(self) -> None:
        expires = datetime.now(timezone.utc) + timedelta(minutes=15)
        info = RateLimitInfo(
            is_locked=True, attempts_remaining=0, lockout_expires_at=expires
        )
        assert info.is_locked is True
        assert info.attempts_remaining == 0
        assert info.lockout_expires_at == expires


# ── module-level functions ────────────────────────────────────────────────────


class TestRateLimitFunctions:
    def test_initial_status_not_locked(self) -> None:
        status = get_status("test@example.com")
        assert status.is_locked is False
        assert status.attempts_remaining == 5

    def test_record_single_failed_attempt(self) -> None:
        status = record_failed_attempt("test@example.com")
        assert status.is_locked is False
        assert status.attempts_remaining == 4

    def test_record_multiple_failed_attempts(self) -> None:
        email = "multi@example.com"
        record_failed_attempt(email)
        record_failed_attempt(email)
        status = record_failed_attempt(email)
        assert status.is_locked is False
        assert status.attempts_remaining == 2

    def test_lockout_after_max_attempts(self) -> None:
        email = "lockout@example.com"
        for _ in range(4):
            status = record_failed_attempt(email)
            assert status.is_locked is False
        status = record_failed_attempt(email)
        assert status.is_locked is True
        assert status.attempts_remaining == 0
        assert status.lockout_expires_at is not None

    def test_is_locked_true_when_locked(self) -> None:
        email = "locked@example.com"
        for _ in range(5):
            record_failed_attempt(email)
        assert is_locked(email) is True

    def test_is_locked_false_when_not_locked(self) -> None:
        assert is_locked("fresh@example.com") is False

    def test_lockout_duration_is_15_minutes(self) -> None:
        email = "duration@example.com"
        for _ in range(5):
            record_failed_attempt(email)
        status = get_status(email)
        assert status.lockout_expires_at is not None
        actual = status.lockout_expires_at - datetime.now(timezone.utc)
        assert actual > timedelta(minutes=14, seconds=59)
        assert actual <= timedelta(minutes=15)

    def test_successful_login_clears_attempts(self) -> None:
        email = "success@example.com"
        record_failed_attempt(email)
        record_failed_attempt(email)
        record_successful_login(email)
        status = get_status(email)
        assert status.attempts_remaining == 5

    def test_different_identifiers_tracked_separately(self) -> None:
        email1 = "user1@example.com"
        email2 = "user2@example.com"
        for _ in range(5):
            record_failed_attempt(email1)
        assert is_locked(email1) is True
        assert is_locked(email2) is False
        assert get_status(email2).attempts_remaining == 5

    def test_reset_clears_lockout(self) -> None:
        email = "reset@example.com"
        for _ in range(5):
            record_failed_attempt(email)
        assert is_locked(email) is True
        reset(email)
        assert is_locked(email) is False
        assert get_status(email).attempts_remaining == 5

    def test_record_attempt_when_already_locked(self) -> None:
        email = "alreadylocked@example.com"
        for _ in range(5):
            record_failed_attempt(email)
        status = record_failed_attempt(email)
        assert status.is_locked is True
        assert status.attempts_remaining == 0
