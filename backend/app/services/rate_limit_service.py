"""Rate limiting service for login attempts.

Implements a sliding-window rate limiter backed by Redis.
After MAX_ATTEMPTS failed attempts within WINDOW_SECONDS the identifier is
locked for LOCKOUT_SECONDS.  All state is stored in Redis, so limits survive
server restarts and work correctly across horizontally-scaled instances.
"""

from datetime import datetime, timedelta, timezone
from typing import NamedTuple

import redis as redis_lib

from app.core.config import settings

MAX_ATTEMPTS: int = 5
LOCKOUT_SECONDS: int = 900  # 15 minutes
WINDOW_SECONDS: int = 900  # sliding window

_ATTEMPTS_PREFIX = "auth:ratelimit:attempts:"
_LOCKOUT_PREFIX = "auth:ratelimit:lockout:"

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
        _redis_client = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def is_locked(identifier: str) -> bool:
    """Return *True* if the identifier is currently locked out."""
    return _redis().ttl(f"{_LOCKOUT_PREFIX}{identifier}") > 0


def get_status(identifier: str) -> RateLimitInfo:
    """Return the current rate-limit status without recording an attempt."""
    r = _redis()
    lockout_ttl = r.ttl(f"{_LOCKOUT_PREFIX}{identifier}")
    if lockout_ttl > 0:
        expires = datetime.now(timezone.utc) + timedelta(seconds=lockout_ttl)
        return RateLimitInfo(
            is_locked=True, attempts_remaining=0, lockout_expires_at=expires
        )

    now_ts = datetime.now(timezone.utc).timestamp()
    window_start = now_ts - WINDOW_SECONDS
    count = int(r.zcount(f"{_ATTEMPTS_PREFIX}{identifier}", window_start, "+inf"))
    return RateLimitInfo(
        is_locked=False,
        attempts_remaining=max(0, MAX_ATTEMPTS - count),
        lockout_expires_at=None,
    )


def record_failed_attempt(identifier: str) -> RateLimitInfo:
    """Record a failed login attempt and return the updated status.

    Uses a Redis sorted set keyed by timestamp to implement a sliding window.
    Entries older than the window are pruned atomically via a pipeline.
    """
    r = _redis()
    lockout_key = f"{_LOCKOUT_PREFIX}{identifier}"
    attempts_key = f"{_ATTEMPTS_PREFIX}{identifier}"

    lockout_ttl = r.ttl(lockout_key)
    if lockout_ttl > 0:
        expires = datetime.now(timezone.utc) + timedelta(seconds=lockout_ttl)
        return RateLimitInfo(
            is_locked=True, attempts_remaining=0, lockout_expires_at=expires
        )

    now = datetime.now(timezone.utc)
    now_ts = now.timestamp()
    window_start = now_ts - WINDOW_SECONDS

    # Atomically prune old entries, record new one, and refresh TTL
    pipe = r.pipeline()
    pipe.zremrangebyscore(attempts_key, "-inf", window_start)
    pipe.zadd(attempts_key, {str(now_ts): now_ts})
    pipe.expire(attempts_key, WINDOW_SECONDS)
    pipe.execute()

    count = int(r.zcount(attempts_key, window_start, "+inf"))

    if count >= MAX_ATTEMPTS:
        r.setex(lockout_key, LOCKOUT_SECONDS, "1")
        expires = now + timedelta(seconds=LOCKOUT_SECONDS)
        return RateLimitInfo(
            is_locked=True, attempts_remaining=0, lockout_expires_at=expires
        )

    return RateLimitInfo(
        is_locked=False,
        attempts_remaining=MAX_ATTEMPTS - count,
        lockout_expires_at=None,
    )


def record_successful_login(identifier: str) -> None:
    """Clear all rate-limit state for an identifier after a successful login."""
    r = _redis()
    r.delete(f"{_ATTEMPTS_PREFIX}{identifier}")
    r.delete(f"{_LOCKOUT_PREFIX}{identifier}")


def reset(identifier: str) -> None:
    """Reset rate-limit state (admin use)."""
    record_successful_login(identifier)
