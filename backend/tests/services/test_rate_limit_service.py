"""Tests for rate limit service module-level functions."""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import fakeredis
import pybreaker
import pytest

from app.services.rate_limit_service import (
    _REDIS_OPEN_INFO,
    CONTRACT_ANALYSIS_HOURLY_MAX,
    TRANSLATION_HOURLY_MAX,
    UPLOAD_BURST_MAX,
    UPLOAD_HOURLY_MAX,
    RateLimitInfo,
    get_status,
    is_locked,
    is_password_reset_locked,
    is_register_locked,
    record_contract_analysis,
    record_document_upload_burst,
    record_document_upload_hourly,
    record_failed_attempt,
    record_password_reset_attempt,
    record_register_attempt,
    record_successful_login,
    record_translation_request,
    reset,
    retry_after_seconds,
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
        # Allow 5s tolerance for time passing between SETEX and TTL read-back
        assert actual > timedelta(minutes=14, seconds=55)
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


# ── Register rate limiting ───────────────────────────────────────────────────


class TestRegisterRateLimit:
    def test_not_locked_initially(self) -> None:
        assert is_register_locked("new@example.com") is False

    def test_single_attempt_not_locked(self) -> None:
        status = record_register_attempt("reg@example.com")
        assert status.is_locked is False
        assert status.attempts_remaining == 2

    def test_lockout_after_three_attempts(self) -> None:
        email = "reg-lockout@example.com"
        for _ in range(2):
            status = record_register_attempt(email)
            assert status.is_locked is False
        status = record_register_attempt(email)
        assert status.is_locked is True
        assert status.attempts_remaining == 0
        assert status.lockout_expires_at is not None

    def test_is_register_locked_after_max(self) -> None:
        email = "reg-locked@example.com"
        for _ in range(3):
            record_register_attempt(email)
        assert is_register_locked(email) is True

    def test_register_and_login_limits_independent(self) -> None:
        email = "independent@example.com"
        for _ in range(3):
            record_register_attempt(email)
        assert is_register_locked(email) is True
        assert is_locked(email) is False


# ── Password reset rate limiting ─────────────────────────────────────────────


class TestPasswordResetRateLimit:
    def test_not_locked_initially(self) -> None:
        assert is_password_reset_locked("new@example.com") is False

    def test_single_attempt_not_locked(self) -> None:
        status = record_password_reset_attempt("reset@example.com")
        assert status.is_locked is False
        assert status.attempts_remaining == 2

    def test_lockout_after_three_attempts(self) -> None:
        email = "reset-lockout@example.com"
        for _ in range(2):
            status = record_password_reset_attempt(email)
            assert status.is_locked is False
        status = record_password_reset_attempt(email)
        assert status.is_locked is True
        assert status.attempts_remaining == 0
        assert status.lockout_expires_at is not None

    def test_is_password_reset_locked_after_max(self) -> None:
        email = "reset-locked@example.com"
        for _ in range(3):
            record_password_reset_attempt(email)
        assert is_password_reset_locked(email) is True

    def test_password_reset_and_login_limits_independent(self) -> None:
        email = "pw-independent@example.com"
        for _ in range(3):
            record_password_reset_attempt(email)
        assert is_password_reset_locked(email) is True
        assert is_locked(email) is False


# ── Document upload rate limiting ─────────────────────────────────────────────


class TestDocumentUploadRateLimit:
    def test_hourly_not_locked_initially(self) -> None:
        info = record_document_upload_hourly("user-1")
        assert info.is_locked is False
        assert info.attempts_remaining == UPLOAD_HOURLY_MAX - 1

    def test_hourly_lockout_after_max_uploads(self) -> None:
        user = "user-hourly-lockout"
        for i in range(UPLOAD_HOURLY_MAX - 1):
            info = record_document_upload_hourly(user)
            assert info.is_locked is False, f"Locked unexpectedly on attempt {i + 1}"
        info = record_document_upload_hourly(user)
        assert info.is_locked is True
        assert info.attempts_remaining == 0
        assert info.lockout_expires_at is not None

    def test_burst_not_locked_initially(self) -> None:
        info = record_document_upload_burst("user-2")
        assert info.is_locked is False
        assert info.attempts_remaining == UPLOAD_BURST_MAX - 1

    def test_burst_lockout_after_max_uploads(self) -> None:
        user = "user-burst-lockout"
        for i in range(UPLOAD_BURST_MAX - 1):
            info = record_document_upload_burst(user)
            assert info.is_locked is False, f"Locked unexpectedly on attempt {i + 1}"
        info = record_document_upload_burst(user)
        assert info.is_locked is True
        assert info.lockout_expires_at is not None

    def test_hourly_and_burst_tracked_independently(self) -> None:
        user = "user-independent"
        # Exhaust burst
        for _ in range(UPLOAD_BURST_MAX):
            record_document_upload_burst(user)
        # Hourly should still have remaining attempts
        hourly = record_document_upload_hourly(user)
        assert hourly.is_locked is False

    def test_different_users_tracked_separately(self) -> None:
        for _ in range(UPLOAD_HOURLY_MAX):
            record_document_upload_hourly("user-a")
        info_b = record_document_upload_hourly("user-b")
        assert info_b.is_locked is False


# ── Translation rate limiting ──────────────────────────────────────────────────


class TestTranslationRateLimit:
    def test_not_locked_initially(self) -> None:
        info = record_translation_request("user-t1")
        assert info.is_locked is False
        assert info.attempts_remaining == TRANSLATION_HOURLY_MAX - 1

    def test_lockout_after_max_requests(self) -> None:
        user = "user-t-lockout"
        for i in range(TRANSLATION_HOURLY_MAX - 1):
            info = record_translation_request(user)
            assert info.is_locked is False, f"Locked unexpectedly on attempt {i + 1}"
        info = record_translation_request(user)
        assert info.is_locked is True
        assert info.lockout_expires_at is not None

    def test_different_users_tracked_separately(self) -> None:
        for _ in range(TRANSLATION_HOURLY_MAX):
            record_translation_request("user-t-a")
        info_b = record_translation_request("user-t-b")
        assert info_b.is_locked is False


# ── Contract analysis rate limiting ───────────────────────────────────────────


class TestContractAnalysisRateLimit:
    def test_not_locked_initially(self) -> None:
        info = record_contract_analysis("user-c1")
        assert info.is_locked is False
        assert info.attempts_remaining == CONTRACT_ANALYSIS_HOURLY_MAX - 1

    def test_lockout_after_max_analyses(self) -> None:
        user = "user-c-lockout"
        for i in range(CONTRACT_ANALYSIS_HOURLY_MAX - 1):
            info = record_contract_analysis(user)
            assert info.is_locked is False, f"Locked unexpectedly on attempt {i + 1}"
        info = record_contract_analysis(user)
        assert info.is_locked is True
        assert info.lockout_expires_at is not None

    def test_contract_and_translation_limits_independent(self) -> None:
        user = "user-c-indep"
        for _ in range(CONTRACT_ANALYSIS_HOURLY_MAX):
            record_contract_analysis(user)
        info = record_translation_request(user)
        assert info.is_locked is False


# ── retry_after_seconds helper ────────────────────────────────────────────────


class TestRetryAfterSeconds:
    def test_returns_remaining_seconds_from_lockout_expires_at(self) -> None:
        expires = datetime.now(timezone.utc) + timedelta(seconds=120)
        info = RateLimitInfo(
            is_locked=True, attempts_remaining=0, lockout_expires_at=expires
        )
        result = retry_after_seconds(info)
        assert 119 <= result <= 120

    def test_returns_fallback_when_no_lockout_expires_at(self) -> None:
        info = RateLimitInfo(
            is_locked=True, attempts_remaining=0, lockout_expires_at=None
        )
        assert retry_after_seconds(info, fallback=999) == 999

    def test_minimum_is_one_second(self) -> None:
        # lockout_expires_at in the past — clamp to 1
        expires = datetime.now(timezone.utc) - timedelta(seconds=5)
        info = RateLimitInfo(
            is_locked=True, attempts_remaining=0, lockout_expires_at=expires
        )
        assert retry_after_seconds(info) == 1


# ── Redis circuit breaker behavior ────────────────────────────────────────────


class TestRedisCircuitBreakerBehavior:
    """Verify fail-open behavior when the Redis circuit breaker is open."""

    def test_is_locked_returns_false_when_circuit_open(self) -> None:
        with patch("app.services.rate_limit_service.redis_breaker") as mock_breaker:
            mock_breaker.call.side_effect = pybreaker.CircuitBreakerError()
            assert is_locked("test@example.com") is False

    def test_is_register_locked_returns_false_when_circuit_open(self) -> None:
        with patch("app.services.rate_limit_service.redis_breaker") as mock_breaker:
            mock_breaker.call.side_effect = pybreaker.CircuitBreakerError()
            assert is_register_locked("test@example.com") is False

    def test_is_password_reset_locked_returns_false_when_circuit_open(self) -> None:
        with patch("app.services.rate_limit_service.redis_breaker") as mock_breaker:
            mock_breaker.call.side_effect = pybreaker.CircuitBreakerError()
            assert is_password_reset_locked("test@example.com") is False

    def test_record_failed_attempt_returns_open_info_when_circuit_open(self) -> None:
        with patch("app.services.rate_limit_service.redis_breaker") as mock_breaker:
            mock_breaker.call.side_effect = pybreaker.CircuitBreakerError()
            info = record_failed_attempt("test@example.com")
            assert info == _REDIS_OPEN_INFO
            assert info.is_locked is False
            assert info.attempts_remaining == 999

    def test_get_status_returns_open_info_when_circuit_open(self) -> None:
        with patch("app.services.rate_limit_service.redis_breaker") as mock_breaker:
            mock_breaker.call.side_effect = pybreaker.CircuitBreakerError()
            info = get_status("test@example.com")
            assert info == _REDIS_OPEN_INFO

    def test_record_successful_login_does_not_raise_when_circuit_open(self) -> None:
        with patch("app.services.rate_limit_service.redis_breaker") as mock_breaker:
            mock_breaker.call.side_effect = pybreaker.CircuitBreakerError()
            record_successful_login("test@example.com")  # must not raise

    def test_redis_open_info_sentinel_values(self) -> None:
        assert _REDIS_OPEN_INFO.is_locked is False
        assert _REDIS_OPEN_INFO.attempts_remaining == 999
        assert _REDIS_OPEN_INFO.lockout_expires_at is None
