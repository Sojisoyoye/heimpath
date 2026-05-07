"""Rate limiting service for authentication endpoints.

Implements a sliding-window rate limiter backed by Redis.
After max failed attempts within a time window, the identifier is
locked for a configurable lockout duration.  All state is stored in Redis,
so limits survive server restarts and work correctly across
horizontally-scaled instances.
"""

import math
from datetime import datetime, timedelta, timezone
from typing import NamedTuple

import redis as redis_lib

from app.services.redis_client import get_redis

# Login rate limit constants
MAX_ATTEMPTS: int = 5
LOCKOUT_SECONDS: int = 900  # 15 minutes
WINDOW_SECONDS: int = 900  # sliding window

# Register rate limit constants
REGISTER_MAX_ATTEMPTS: int = 3
REGISTER_WINDOW_SECONDS: int = 3600  # 1 hour
REGISTER_LOCKOUT_SECONDS: int = 3600  # 1 hour

# Password reset rate limit constants
PASSWORD_RESET_MAX_ATTEMPTS: int = 3
PASSWORD_RESET_WINDOW_SECONDS: int = 3600  # 1 hour
PASSWORD_RESET_LOCKOUT_SECONDS: int = 3600  # 1 hour

# Resend verification rate limit constants
RESEND_VERIFICATION_MAX_ATTEMPTS: int = 3
RESEND_VERIFICATION_WINDOW_SECONDS: int = 3600  # 1 hour
RESEND_VERIFICATION_LOCKOUT_SECONDS: int = 3600  # 1 hour

_ATTEMPTS_PREFIX = "auth:ratelimit:attempts:"
_LOCKOUT_PREFIX = "auth:ratelimit:lockout:"

_REGISTER_ATTEMPTS_PREFIX = "auth:ratelimit:register:attempts:"
_REGISTER_LOCKOUT_PREFIX = "auth:ratelimit:register:lockout:"

_PASSWORD_RESET_ATTEMPTS_PREFIX = "auth:ratelimit:password_reset:attempts:"
_PASSWORD_RESET_LOCKOUT_PREFIX = "auth:ratelimit:password_reset:lockout:"

_RESEND_VERIFICATION_ATTEMPTS_PREFIX = "auth:ratelimit:resend_verification:attempts:"
_RESEND_VERIFICATION_LOCKOUT_PREFIX = "auth:ratelimit:resend_verification:lockout:"

# IP-based login rate limit constants
# Keyed by client IP address — caps total failed attempts regardless of email.
# Prevents account enumeration / lockout spraying from a single source.
IP_FAILED_MAX: int = 30
IP_FAILED_WINDOW_SECONDS: int = 3600  # 1 hour sliding window
# Lockout equals the window so an IP is cooled off for a full hour.
IP_FAILED_LOCKOUT_SECONDS: int = 3600  # 1 hour

_IP_FAILED_ATTEMPTS_PREFIX = "auth:ratelimit:ip:attempts:"
_IP_FAILED_LOCKOUT_PREFIX = "auth:ratelimit:ip:lockout:"

# IP-based registration rate limit constants
# Prevents a single source from mass-registering accounts with different emails
# (which would exhaust transactional email API daily quotas).
IP_REGISTER_MAX: int = 5
IP_REGISTER_WINDOW_SECONDS: int = 3600  # 1 hour
IP_REGISTER_LOCKOUT_SECONDS: int = 3600  # 1 hour

_IP_REGISTER_ATTEMPTS_PREFIX = "auth:ratelimit:ip_register:attempts:"
_IP_REGISTER_LOCKOUT_PREFIX = "auth:ratelimit:ip_register:lockout:"

# IP-based password reset rate limit constants
# Prevents a bot from triggering password reset emails for many different
# addresses from a single source.
IP_PASSWORD_RESET_MAX: int = 10
IP_PASSWORD_RESET_WINDOW_SECONDS: int = 3600  # 1 hour
IP_PASSWORD_RESET_LOCKOUT_SECONDS: int = 3600  # 1 hour

_IP_PASSWORD_RESET_ATTEMPTS_PREFIX = "auth:ratelimit:ip_password_reset:attempts:"
_IP_PASSWORD_RESET_LOCKOUT_PREFIX = "auth:ratelimit:ip_password_reset:lockout:"

# IP-based resend-verification rate limit constants
IP_RESEND_VERIFICATION_MAX: int = 10
IP_RESEND_VERIFICATION_WINDOW_SECONDS: int = 3600  # 1 hour
IP_RESEND_VERIFICATION_LOCKOUT_SECONDS: int = 3600  # 1 hour

_IP_RESEND_VERIFICATION_ATTEMPTS_PREFIX = (
    "auth:ratelimit:ip_resend_verification:attempts:"
)
_IP_RESEND_VERIFICATION_LOCKOUT_PREFIX = (
    "auth:ratelimit:ip_resend_verification:lockout:"
)

# ── Professional click rate limiting ─────────────────────────────────────────
# Professional click rate limit constants
CLICK_MAX_ATTEMPTS: int = 20
CLICK_WINDOW_SECONDS: int = 60  # 1 minute sliding window
# Lockout equals the sliding window so a burst is fully cooled off before the
# next window opens — preventing immediate re-entry after the lockout expires.
CLICK_LOCKOUT_SECONDS: int = 60  # 1 minute

_CLICK_ATTEMPTS_PREFIX = "api:ratelimit:click:attempts:"
_CLICK_LOCKOUT_PREFIX = "api:ratelimit:click:lockout:"

# Module-level Redis client (connection pool, lazily initialised)
_redis_client: redis_lib.Redis | None = None


class RateLimitInfo(NamedTuple):
    """Snapshot of the current rate-limit state for an identifier."""

    is_locked: bool
    attempts_remaining: int
    lockout_expires_at: datetime | None


def _redis() -> redis_lib.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = get_redis()
    return _redis_client


# ── Generic helpers ──────────────────────────────────────────────────────────


def _check_limit(
    identifier: str,
    attempts_prefix: str,
    lockout_prefix: str,
    max_attempts: int,
    window_seconds: int,
) -> RateLimitInfo:
    """Return current rate-limit status without recording an attempt."""
    r = _redis()
    lockout_ttl = r.ttl(f"{lockout_prefix}{identifier}")
    if lockout_ttl > 0:
        expires = datetime.now(timezone.utc) + timedelta(seconds=lockout_ttl)
        return RateLimitInfo(
            is_locked=True, attempts_remaining=0, lockout_expires_at=expires
        )

    now_ts = datetime.now(timezone.utc).timestamp()
    window_start = now_ts - window_seconds
    count = int(r.zcount(f"{attempts_prefix}{identifier}", window_start, "+inf"))
    return RateLimitInfo(
        is_locked=False,
        attempts_remaining=max(0, max_attempts - count),
        lockout_expires_at=None,
    )


def _record_attempt(
    identifier: str,
    attempts_prefix: str,
    lockout_prefix: str,
    max_attempts: int,
    window_seconds: int,
    lockout_seconds: int,
) -> RateLimitInfo:
    """Record a failed attempt and return updated status."""
    r = _redis()
    lockout_key = f"{lockout_prefix}{identifier}"
    attempts_key = f"{attempts_prefix}{identifier}"

    lockout_ttl = r.ttl(lockout_key)
    if lockout_ttl > 0:
        expires = datetime.now(timezone.utc) + timedelta(seconds=lockout_ttl)
        return RateLimitInfo(
            is_locked=True, attempts_remaining=0, lockout_expires_at=expires
        )

    now = datetime.now(timezone.utc)
    now_ts = now.timestamp()
    window_start = now_ts - window_seconds

    # Atomically prune old entries, record new one, and refresh TTL
    pipe = r.pipeline()
    pipe.zremrangebyscore(attempts_key, "-inf", window_start)
    pipe.zadd(attempts_key, {str(now_ts): now_ts})
    pipe.expire(attempts_key, window_seconds)
    pipe.execute()

    count = int(r.zcount(attempts_key, window_start, "+inf"))

    if count >= max_attempts:
        r.setex(lockout_key, lockout_seconds, "1")
        expires = now + timedelta(seconds=lockout_seconds)
        return RateLimitInfo(
            is_locked=True, attempts_remaining=0, lockout_expires_at=expires
        )

    return RateLimitInfo(
        is_locked=False,
        attempts_remaining=max_attempts - count,
        lockout_expires_at=None,
    )


def _clear(identifier: str, attempts_prefix: str, lockout_prefix: str) -> None:
    """Clear all rate-limit state for an identifier."""
    r = _redis()
    r.delete(f"{attempts_prefix}{identifier}")
    r.delete(f"{lockout_prefix}{identifier}")


# ── Login rate limiting ──────────────────────────────────────────────────────


def is_locked(identifier: str) -> bool:
    """Return *True* if the identifier is currently locked out."""
    return _redis().ttl(f"{_LOCKOUT_PREFIX}{identifier}") > 0


def get_status(identifier: str) -> RateLimitInfo:
    """Return the current login rate-limit status without recording an attempt."""
    return _check_limit(
        identifier, _ATTEMPTS_PREFIX, _LOCKOUT_PREFIX, MAX_ATTEMPTS, WINDOW_SECONDS
    )


def record_failed_attempt(identifier: str) -> RateLimitInfo:
    """Record a failed login attempt and return the updated status."""
    return _record_attempt(
        identifier,
        _ATTEMPTS_PREFIX,
        _LOCKOUT_PREFIX,
        MAX_ATTEMPTS,
        WINDOW_SECONDS,
        LOCKOUT_SECONDS,
    )


def record_successful_login(identifier: str) -> None:
    """Clear all rate-limit state for an identifier after a successful login."""
    _clear(identifier, _ATTEMPTS_PREFIX, _LOCKOUT_PREFIX)


def reset(identifier: str) -> None:
    """Reset rate-limit state (admin use)."""
    record_successful_login(identifier)


# ── Register rate limiting ───────────────────────────────────────────────────


def is_register_locked(identifier: str) -> bool:
    """Return *True* if the identifier is locked for registration."""
    return _redis().ttl(f"{_REGISTER_LOCKOUT_PREFIX}{identifier}") > 0


def record_register_attempt(identifier: str) -> RateLimitInfo:
    """Record a registration attempt and return the updated status."""
    return _record_attempt(
        identifier,
        _REGISTER_ATTEMPTS_PREFIX,
        _REGISTER_LOCKOUT_PREFIX,
        REGISTER_MAX_ATTEMPTS,
        REGISTER_WINDOW_SECONDS,
        REGISTER_LOCKOUT_SECONDS,
    )


# ── Password reset rate limiting ─────────────────────────────────────────────


def is_password_reset_locked(identifier: str) -> bool:
    """Return *True* if the identifier is locked for password resets."""
    return _redis().ttl(f"{_PASSWORD_RESET_LOCKOUT_PREFIX}{identifier}") > 0


def record_password_reset_attempt(identifier: str) -> RateLimitInfo:
    """Record a password-reset attempt and return the updated status."""
    return _record_attempt(
        identifier,
        _PASSWORD_RESET_ATTEMPTS_PREFIX,
        _PASSWORD_RESET_LOCKOUT_PREFIX,
        PASSWORD_RESET_MAX_ATTEMPTS,
        PASSWORD_RESET_WINDOW_SECONDS,
        PASSWORD_RESET_LOCKOUT_SECONDS,
    )


# ── Resend verification rate limiting ────────────────────────────────────────


def is_resend_verification_locked(identifier: str) -> bool:
    """Return *True* if the identifier is locked for resend verification."""
    return _redis().ttl(f"{_RESEND_VERIFICATION_LOCKOUT_PREFIX}{identifier}") > 0


def record_resend_verification_attempt(identifier: str) -> RateLimitInfo:
    """Record a resend-verification attempt and return the updated status."""
    return _record_attempt(
        identifier,
        _RESEND_VERIFICATION_ATTEMPTS_PREFIX,
        _RESEND_VERIFICATION_LOCKOUT_PREFIX,
        RESEND_VERIFICATION_MAX_ATTEMPTS,
        RESEND_VERIFICATION_WINDOW_SECONDS,
        RESEND_VERIFICATION_LOCKOUT_SECONDS,
    )


# ── Professional click rate limiting ─────────────────────────────────────────


def record_click_attempt(identifier: str) -> RateLimitInfo:
    """Record a professional click attempt and return the updated status."""
    return _record_attempt(
        identifier,
        _CLICK_ATTEMPTS_PREFIX,
        _CLICK_LOCKOUT_PREFIX,
        CLICK_MAX_ATTEMPTS,
        CLICK_WINDOW_SECONDS,
        CLICK_LOCKOUT_SECONDS,
    )


# ── IP-based login rate limiting ──────────────────────────────────────────────


def is_ip_blocked(ip: str) -> bool:
    """Return *True* if the IP is currently locked due to too many failed logins."""
    return _redis().ttl(f"{_IP_FAILED_LOCKOUT_PREFIX}{ip}") > 0


def record_ip_failed(ip: str) -> RateLimitInfo:
    """Record a failed login attempt from an IP and return the updated status."""
    return _record_attempt(
        ip,
        _IP_FAILED_ATTEMPTS_PREFIX,
        _IP_FAILED_LOCKOUT_PREFIX,
        IP_FAILED_MAX,
        IP_FAILED_WINDOW_SECONDS,
        IP_FAILED_LOCKOUT_SECONDS,
    )


# ── IP-based registration rate limiting ───────────────────────────────────────


def is_ip_register_locked(ip: str) -> bool:
    """Return *True* if the IP is locked for new account registrations."""
    return _redis().ttl(f"{_IP_REGISTER_LOCKOUT_PREFIX}{ip}") > 0


def record_ip_register(ip: str) -> RateLimitInfo:
    """Record a registration from an IP and return the updated status."""
    return _record_attempt(
        ip,
        _IP_REGISTER_ATTEMPTS_PREFIX,
        _IP_REGISTER_LOCKOUT_PREFIX,
        IP_REGISTER_MAX,
        IP_REGISTER_WINDOW_SECONDS,
        IP_REGISTER_LOCKOUT_SECONDS,
    )


# ── IP-based password reset rate limiting ─────────────────────────────────────


def is_ip_password_reset_locked(ip: str) -> bool:
    """Return *True* if the IP is locked for password reset requests."""
    return _redis().ttl(f"{_IP_PASSWORD_RESET_LOCKOUT_PREFIX}{ip}") > 0


def record_ip_password_reset(ip: str) -> RateLimitInfo:
    """Record a password reset request from an IP and return the updated status."""
    return _record_attempt(
        ip,
        _IP_PASSWORD_RESET_ATTEMPTS_PREFIX,
        _IP_PASSWORD_RESET_LOCKOUT_PREFIX,
        IP_PASSWORD_RESET_MAX,
        IP_PASSWORD_RESET_WINDOW_SECONDS,
        IP_PASSWORD_RESET_LOCKOUT_SECONDS,
    )


# ── IP-based resend-verification rate limiting ────────────────────────────────


def is_ip_resend_verification_locked(ip: str) -> bool:
    """Return *True* if the IP is locked for resend-verification requests."""
    return _redis().ttl(f"{_IP_RESEND_VERIFICATION_LOCKOUT_PREFIX}{ip}") > 0


def record_ip_resend_verification(ip: str) -> RateLimitInfo:
    """Record a resend-verification request from an IP and return the updated status."""
    return _record_attempt(
        ip,
        _IP_RESEND_VERIFICATION_ATTEMPTS_PREFIX,
        _IP_RESEND_VERIFICATION_LOCKOUT_PREFIX,
        IP_RESEND_VERIFICATION_MAX,
        IP_RESEND_VERIFICATION_WINDOW_SECONDS,
        IP_RESEND_VERIFICATION_LOCKOUT_SECONDS,
    )


# ── Document upload rate limiting ─────────────────────────────────────────────
# Per-user hourly limit: protects Azure Translator + Anthropic from bulk abuse.
UPLOAD_HOURLY_MAX: int = 10
UPLOAD_HOURLY_WINDOW: int = 3600  # 1 hour
UPLOAD_HOURLY_LOCKOUT: int = 3600  # 1 hour

# Per-user burst limit: prevents rapid hammering of the upload endpoint.
UPLOAD_BURST_MAX: int = 3
UPLOAD_BURST_WINDOW: int = 60  # 1 minute
UPLOAD_BURST_LOCKOUT: int = 60  # 1 minute

_UPLOAD_HOURLY_ATTEMPTS_PREFIX = "api:ratelimit:doc_upload:hourly:attempts:"
_UPLOAD_HOURLY_LOCKOUT_PREFIX = "api:ratelimit:doc_upload:hourly:lockout:"
_UPLOAD_BURST_ATTEMPTS_PREFIX = "api:ratelimit:doc_upload:burst:attempts:"
_UPLOAD_BURST_LOCKOUT_PREFIX = "api:ratelimit:doc_upload:burst:lockout:"


def record_document_upload_hourly(user_id: str) -> RateLimitInfo:
    """Record a document upload for the hourly limit (10 uploads/hour per user)."""
    return _record_attempt(
        user_id,
        _UPLOAD_HOURLY_ATTEMPTS_PREFIX,
        _UPLOAD_HOURLY_LOCKOUT_PREFIX,
        UPLOAD_HOURLY_MAX,
        UPLOAD_HOURLY_WINDOW,
        UPLOAD_HOURLY_LOCKOUT,
    )


def record_document_upload_burst(user_id: str) -> RateLimitInfo:
    """Record a document upload for the burst limit (3 uploads/minute per user)."""
    return _record_attempt(
        user_id,
        _UPLOAD_BURST_ATTEMPTS_PREFIX,
        _UPLOAD_BURST_LOCKOUT_PREFIX,
        UPLOAD_BURST_MAX,
        UPLOAD_BURST_WINDOW,
        UPLOAD_BURST_LOCKOUT,
    )


# ── Translation rate limiting ──────────────────────────────────────────────────
# Per-user hourly limit: protects Azure Translator monthly character quota.
TRANSLATION_HOURLY_MAX: int = 50
TRANSLATION_HOURLY_WINDOW: int = 3600  # 1 hour
TRANSLATION_HOURLY_LOCKOUT: int = 3600  # 1 hour

_TRANSLATION_ATTEMPTS_PREFIX = "api:ratelimit:translation:hourly:attempts:"
_TRANSLATION_LOCKOUT_PREFIX = "api:ratelimit:translation:hourly:lockout:"


def record_translation_request(user_id: str) -> RateLimitInfo:
    """Record a translation request for the hourly limit (50 requests/hour per user)."""
    return _record_attempt(
        user_id,
        _TRANSLATION_ATTEMPTS_PREFIX,
        _TRANSLATION_LOCKOUT_PREFIX,
        TRANSLATION_HOURLY_MAX,
        TRANSLATION_HOURLY_WINDOW,
        TRANSLATION_HOURLY_LOCKOUT,
    )


# ── Contract analysis rate limiting ───────────────────────────────────────────
# Per-user hourly limit: each analysis invokes Anthropic Claude — highest cost.
CONTRACT_ANALYSIS_HOURLY_MAX: int = 5
CONTRACT_ANALYSIS_HOURLY_WINDOW: int = 3600  # 1 hour
CONTRACT_ANALYSIS_HOURLY_LOCKOUT: int = 3600  # 1 hour

_CONTRACT_ANALYSIS_ATTEMPTS_PREFIX = "api:ratelimit:contract_analysis:attempts:"
_CONTRACT_ANALYSIS_LOCKOUT_PREFIX = "api:ratelimit:contract_analysis:lockout:"


def record_contract_analysis(user_id: str) -> RateLimitInfo:
    """Record a contract analysis request (5 analyses/hour per user)."""
    return _record_attempt(
        user_id,
        _CONTRACT_ANALYSIS_ATTEMPTS_PREFIX,
        _CONTRACT_ANALYSIS_LOCKOUT_PREFIX,
        CONTRACT_ANALYSIS_HOURLY_MAX,
        CONTRACT_ANALYSIS_HOURLY_WINDOW,
        CONTRACT_ANALYSIS_HOURLY_LOCKOUT,
    )


# ── Shared helper ──────────────────────────────────────────────────────────────


def retry_after_seconds(info: RateLimitInfo, fallback: int = 3600) -> int:
    """Return seconds until the rate limit resets, for use in Retry-After headers."""
    if info.lockout_expires_at:
        delta = (info.lockout_expires_at - datetime.now(timezone.utc)).total_seconds()
        return max(1, math.ceil(delta))
    return fallback
