"""JWT token utilities for user authentication.

Module-level functions for token creation, validation, blacklisting, and logout.
The token blacklist is backed by Redis for persistence across restarts and
horizontal scaling.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

import jwt
import pybreaker
import redis as redis_lib
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel

from app.core.circuit_breakers import redis_breaker
from app.core.config import settings
from app.services.redis_client import get_redis

ALGORITHM = "HS256"
_BLACKLIST_PREFIX = "auth:blacklist:"
_GRACE_PREFIX = "auth:refresh_grace:"
_REFRESH_LOCK_PREFIX = "auth:refresh_lock:"
REFRESH_ROTATION_GRACE_SECONDS = 30
# Lock TTL is slightly longer than the grace window so a lock set just before
# the TTL check can never expire before the grace window is established.
_REFRESH_LOCK_TTL_SECONDS = REFRESH_ROTATION_GRACE_SECONDS + 5


class TokenRefreshConflictError(Exception):
    """Raised when a concurrent rotation is already in progress for the token."""

    def __init__(self, jti: str) -> None:
        super().__init__(f"Refresh rotation already in progress for JTI {jti}")
        self.jti = jti


_logger = logging.getLogger(__name__)

# Module-level Redis client (connection pool, created lazily)
_redis_client: redis_lib.Redis | None = None


class TokenType(str, Enum):
    """Type of JWT token."""

    ACCESS = "access"
    REFRESH = "refresh"


class TokenData(BaseModel):
    """Data contained in a JWT token."""

    sub: str
    type: TokenType
    exp: datetime
    jti: str | None = None


def _redis() -> redis_lib.Redis:
    """Return the shared Redis client (lazily initialised)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = get_redis()
    return _redis_client


# ── token creation ────────────────────────────────────────────────────────────


def create_access_token(
    subject: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token.

    Access tokens are always short-lived (``ACCESS_TOKEN_EXPIRE_MINUTES``).
    "Remember me" UX is handled by extending the refresh token lifetime, not
    the access token.

    Args:
        subject: The user ID to embed as the ``sub`` claim.
        expires_delta: Custom lifetime override (used in tests).

    Returns:
        Encoded JWT string.
    """
    expire = (
        datetime.now(timezone.utc) + expires_delta
        if expires_delta is not None
        else datetime.now(timezone.utc)
        + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode: dict[str, Any] = {
        "sub": subject,
        "type": TokenType.ACCESS.value,
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    subject: str,
    expires_delta: timedelta | None = None,
    remember_me: bool = False,
) -> str:
    """Create a signed JWT refresh token.

    Refresh tokens carry a unique ``jti`` claim so they can be individually
    blacklisted on logout or rotation.

    Args:
        subject: The user ID to embed as the ``sub`` claim.
        expires_delta: Custom lifetime override (used in tests).
        remember_me: When *True* the token lives for
            ``settings.REMEMBER_ME_EXPIRE_DAYS`` days instead of the
            default ``REFRESH_TOKEN_EXPIRE_DAYS``.

    Returns:
        Encoded JWT string.
    """
    if expires_delta is not None:
        expire = datetime.now(timezone.utc) + expires_delta
    elif remember_me:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REMEMBER_ME_EXPIRE_DAYS
        )
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    jti = str(uuid.uuid4())
    to_encode: dict[str, Any] = {
        "sub": subject,
        "type": TokenType.REFRESH.value,
        "exp": expire,
        "jti": jti,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


# ── token validation ──────────────────────────────────────────────────────────


def decode_token(token: str) -> dict[str, Any] | None:
    """Decode and verify the JWT signature and expiry.

    Returns the raw payload dict, or *None* on any validation failure.
    Does **not** check the blacklist — use :func:`verify_token` for that.
    """
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except InvalidTokenError:
        return None


def verify_token(token: str) -> TokenData | None:
    """Fully validate a token: signature, expiry, and blacklist.

    Blacklisted refresh tokens in their rotation grace window are still
    accepted to handle concurrent refresh requests (see
    :func:`_rotate_refresh_token`).

    Args:
        token: Encoded JWT string.

    Returns:
        :class:`TokenData` when the token is valid and not blacklisted,
        *None* otherwise.
    """
    payload = decode_token(token)
    if payload is None:
        return None

    jti = payload.get("jti")
    if jti and is_token_blacklisted(jti):
        # Allow the token if it is within the post-rotation grace window
        if not is_token_in_grace_period(jti):
            return None

    try:
        return TokenData(
            sub=payload["sub"],
            type=TokenType(payload["type"]),
            exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
            jti=jti,
        )
    except (KeyError, ValueError):
        return None


# ── blacklist (Redis-backed) ──────────────────────────────────────────────────


def blacklist_token(jti: str, expires_at: datetime) -> None:
    """Blacklist a token JTI in Redis until its natural expiry.

    The Redis key TTL matches the remaining token lifetime so the blacklist
    entry is automatically evicted when the token would have expired anyway.

    Fail-safe: if Redis is unavailable (circuit open or ``RedisError``), a
    warning is logged and the operation is skipped.  The caller (logout) still
    succeeds — the token will expire on its own.

    Args:
        jti: Unique token identifier (``jti`` claim).
        expires_at: Token expiry timestamp (used to compute TTL).
    """
    ttl = max(int((expires_at - datetime.now(timezone.utc)).total_seconds()), 1)
    try:
        redis_breaker.call(_redis().setex, f"{_BLACKLIST_PREFIX}{jti}", ttl, "1")
    except (pybreaker.CircuitBreakerError, redis_lib.RedisError):
        _logger.warning(
            "Redis unavailable — token %s could not be blacklisted (logout proceeds)",
            jti,
        )


def is_token_blacklisted(jti: str) -> bool:
    """Return *True* if the JTI is present in the Redis blacklist.

    Fail-open: returns *False* (token accepted) when Redis is unavailable.
    """
    try:
        return bool(redis_breaker.call(_redis().exists, f"{_BLACKLIST_PREFIX}{jti}"))
    except (pybreaker.CircuitBreakerError, redis_lib.RedisError):
        return False


def is_token_in_grace_period(jti: str) -> bool:
    """Return *True* if a rotation grace window is active for this JTI.

    After refresh token rotation the old JTI is blacklisted but a short
    grace key is set so concurrent in-flight refresh requests still succeed.

    Fail-open: returns *False* when Redis is unavailable.
    """
    try:
        return bool(redis_breaker.call(_redis().exists, f"{_GRACE_PREFIX}{jti}"))
    except (pybreaker.CircuitBreakerError, redis_lib.RedisError):
        return False


def _acquire_refresh_lock(jti: str) -> bool:
    """Acquire a distributed lock for refresh token rotation.

    Uses Redis SET NX EX to atomically create the lock key only when it does
    not already exist.  Returns *True* when the lock was acquired, *False*
    when another process already holds it.

    Fail-open: returns *True* (allow refresh) when Redis is unavailable so
    that a Redis outage does not prevent users from refreshing their tokens.
    """
    key = f"{_REFRESH_LOCK_PREFIX}{jti}"
    try:
        return bool(
            redis_breaker.call(
                _redis().set, key, "1", nx=True, ex=_REFRESH_LOCK_TTL_SECONDS
            )
        )
    except (pybreaker.CircuitBreakerError, redis_lib.RedisError):
        _logger.warning(
            "Redis unavailable — proceeding with refresh for JTI %s without lock",
            jti,
        )
        return True


def _release_refresh_lock(jti: str) -> None:
    """Release the distributed rotation lock for *jti*."""
    key = f"{_REFRESH_LOCK_PREFIX}{jti}"
    try:
        redis_breaker.call(_redis().delete, key)
    except (pybreaker.CircuitBreakerError, redis_lib.RedisError):
        # The TTL will clean up the key automatically; this is not fatal.
        pass


def _rotate_refresh_token(jti: str, expires_at: datetime) -> None:
    """Blacklist *jti* and set a short grace window for concurrent requests.

    Called during refresh token rotation so that two near-simultaneous
    refresh requests with the same old token both succeed within the
    :data:`REFRESH_ROTATION_GRACE_SECONDS` window.
    """
    blacklist_token(jti, expires_at)
    try:
        redis_breaker.call(
            _redis().setex, f"{_GRACE_PREFIX}{jti}", REFRESH_ROTATION_GRACE_SECONDS, "1"
        )
    except (pybreaker.CircuitBreakerError, redis_lib.RedisError):
        _logger.warning(
            "Redis unavailable — refresh grace window for token %s not set",
            jti,
        )


# ── higher-level operations ───────────────────────────────────────────────────


def refresh_access_token(refresh_token: str) -> tuple[str, str] | None:
    """Issue new access and refresh tokens from a valid refresh token.

    The old refresh token is blacklisted immediately and a
    :data:`REFRESH_ROTATION_GRACE_SECONDS` grace window is set to handle
    concurrent requests that arrive with the same old token.

    A distributed Redis lock (keyed on the token JTI) is held for the
    duration of the rotation so that two truly simultaneous requests cannot
    both issue new token pairs from the same old token.

    Args:
        refresh_token: A refresh token previously issued by
            :func:`create_refresh_token`.

    Returns:
        ``(new_access_token, new_refresh_token)`` tuple, or *None* if the
        refresh token is invalid, expired, or past its grace window.

    Raises:
        TokenRefreshConflictError: When a concurrent rotation is already in
            progress for the same token JTI.
    """
    # Decode first (cheap) to obtain the JTI before acquiring the lock.
    payload = decode_token(refresh_token)
    if payload is None:
        return None
    jti = payload.get("jti")
    if jti is None:
        # Refresh tokens always carry a jti; reject if somehow missing.
        return None

    if not _acquire_refresh_lock(jti):
        raise TokenRefreshConflictError(jti)

    try:
        token_data = verify_token(refresh_token)
        if token_data is None:
            return None
        if token_data.type != TokenType.REFRESH:
            return None
        _rotate_refresh_token(jti, token_data.exp)
        new_access = create_access_token(subject=token_data.sub)
        # New refresh token uses the default lifetime. The remember_me extended
        # lifetime applies only to the initial login token; subsequent rotations
        # issue standard 7-day tokens (users remain active via silent refresh).
        new_refresh = create_refresh_token(subject=token_data.sub)
        return new_access, new_refresh
    finally:
        _release_refresh_lock(jti)


def logout(refresh_token: str) -> bool:
    """Blacklist a refresh token, effectively logging the user out.

    Args:
        refresh_token: The refresh token to invalidate.

    Returns:
        *True* if the token was successfully blacklisted, *False* if the
        token was invalid (treated as a no-op; logout always succeeds from
        the caller's perspective).
    """
    payload = decode_token(refresh_token)
    if payload is None:
        return False
    jti = payload.get("jti")
    if jti:
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        blacklist_token(jti, expires_at)
        return True
    return False
