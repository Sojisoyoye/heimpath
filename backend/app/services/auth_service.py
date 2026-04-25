"""JWT token utilities for user authentication.

Module-level functions for token creation, validation, blacklisting, and logout.
The token blacklist is backed by Redis for persistence across restarts and
horizontal scaling.
"""

import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

import jwt
import redis as redis_lib
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel

from app.core.config import settings
from app.services.redis_client import get_redis

ALGORITHM = "HS256"
_BLACKLIST_PREFIX = "auth:blacklist:"

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
    remember_me: bool = False,
) -> str:
    """Create a signed JWT access token.

    Args:
        subject: The user ID to embed as the ``sub`` claim.
        expires_delta: Custom lifetime. Overrides ``remember_me`` and the
            default 1-hour window when provided.
        remember_me: When *True* the token lives for
            ``settings.REMEMBER_ME_EXPIRE_DAYS`` days instead of 1 hour.

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
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
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
) -> str:
    """Create a signed JWT refresh token.

    Refresh tokens carry a unique ``jti`` claim so they can be individually
    blacklisted on logout.

    Args:
        subject: The user ID to embed as the ``sub`` claim.
        expires_delta: Custom lifetime. Defaults to
            ``settings.REFRESH_TOKEN_EXPIRE_DAYS`` days.

    Returns:
        Encoded JWT string.
    """
    expire = (
        datetime.now(timezone.utc) + expires_delta
        if expires_delta is not None
        else datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
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

    Args:
        jti: Unique token identifier (``jti`` claim).
        expires_at: Token expiry timestamp (used to compute TTL).
    """
    ttl = max(int((expires_at - datetime.now(timezone.utc)).total_seconds()), 1)
    _redis().setex(f"{_BLACKLIST_PREFIX}{jti}", ttl, "1")


def is_token_blacklisted(jti: str) -> bool:
    """Return *True* if the JTI is present in the Redis blacklist."""
    return bool(_redis().exists(f"{_BLACKLIST_PREFIX}{jti}"))


# ── higher-level operations ───────────────────────────────────────────────────


def refresh_access_token(refresh_token: str) -> str | None:
    """Issue a new access token from a valid, non-blacklisted refresh token.

    Args:
        refresh_token: A refresh token previously issued by
            :func:`create_refresh_token`.

    Returns:
        New access token string, or *None* if the refresh token is invalid,
        expired, or blacklisted.
    """
    token_data = verify_token(refresh_token)
    if token_data is None:
        return None
    if token_data.type != TokenType.REFRESH:
        return None
    return create_access_token(subject=token_data.sub)


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
