"""Password reset token service.

Handles generation, storage, and validation of password reset tokens.
Tokens expire after 1 hour and are stored in Redis so they survive
container restarts and work across horizontally-scaled instances.
"""

import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import NamedTuple

import redis as redis_lib

from app.core.config import settings


class PasswordResetToken(NamedTuple):
    """Password reset token data."""

    token: str
    user_id: str
    email: str
    expires_at: datetime
    created_at: datetime


# Constants
TOKEN_EXPIRY_HOURS: int = 1
_TOKEN_LENGTH: int = 32
_TOKEN_PREFIX = "pwreset:token:"
_USER_PREFIX = "pwreset:user:"

# Module-level Redis client (lazily initialised)
_redis_client: redis_lib.Redis | None = None


def _redis() -> redis_lib.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def _serialize_token(token: PasswordResetToken) -> str:
    """Serialize a PasswordResetToken to a JSON string for Redis storage."""
    return json.dumps(
        {
            "token": token.token,
            "user_id": token.user_id,
            "email": token.email,
            "expires_at": token.expires_at.isoformat(),
            "created_at": token.created_at.isoformat(),
        }
    )


def _deserialize_token(data: str) -> PasswordResetToken:
    """Deserialize a JSON string from Redis to a PasswordResetToken."""
    parsed = json.loads(data)
    return PasswordResetToken(
        token=parsed["token"],
        user_id=parsed["user_id"],
        email=parsed["email"],
        expires_at=datetime.fromisoformat(parsed["expires_at"]),
        created_at=datetime.fromisoformat(parsed["created_at"]),
    )


def generate_token(user_id: str, email: str) -> PasswordResetToken:
    """Generate a new password reset token.

    If a token already exists for the user, it is invalidated
    and a new one is created.

    Args:
        user_id: The user's ID.
        email: The user's email address.

    Returns:
        PasswordResetToken with the generated token data.
    """
    r = _redis()

    # Invalidate any existing token for this user
    old_token = r.get(f"{_USER_PREFIX}{user_id}")
    if old_token:
        r.delete(f"{_TOKEN_PREFIX}{old_token}")

    # Generate new token
    token = secrets.token_hex(_TOKEN_LENGTH)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=TOKEN_EXPIRY_HOURS)
    ttl_seconds = TOKEN_EXPIRY_HOURS * 3600

    reset_token = PasswordResetToken(
        token=token,
        user_id=user_id,
        email=email,
        expires_at=expires_at,
        created_at=now,
    )

    # Store token → data and user → token mappings with TTL
    pipe = r.pipeline()
    pipe.setex(f"{_TOKEN_PREFIX}{token}", ttl_seconds, _serialize_token(reset_token))
    pipe.setex(f"{_USER_PREFIX}{user_id}", ttl_seconds, token)
    pipe.execute()

    return reset_token


def verify_token(token: str) -> PasswordResetToken | None:
    """Verify a password reset token.

    Checks if the token exists and is not expired.
    Does NOT consume the token.

    Args:
        token: The reset token to check.

    Returns:
        PasswordResetToken if valid, None if invalid or expired.
    """
    data = _redis().get(f"{_TOKEN_PREFIX}{token}")
    if data is None:
        return None

    reset_token = _deserialize_token(data)

    # Double-check expiration (Redis TTL handles cleanup, but be safe)
    if datetime.now(timezone.utc) >= reset_token.expires_at:
        _cleanup_token(token)
        return None

    return reset_token


def consume_token(token: str) -> PasswordResetToken | None:
    """Verify and consume a password reset token.

    The token is invalidated after successful verification.

    Args:
        token: The reset token to consume.

    Returns:
        PasswordResetToken if valid, None if invalid or expired.
    """
    reset_token = verify_token(token)
    if reset_token is None:
        return None

    _cleanup_token(token)
    return reset_token


def invalidate_user_tokens(user_id: str) -> None:
    """Invalidate all reset tokens for a user.

    Args:
        user_id: The user's ID.
    """
    r = _redis()
    token = r.get(f"{_USER_PREFIX}{user_id}")
    if token:
        _cleanup_token(token)


def _cleanup_token(token: str) -> None:
    """Remove a token from storage."""
    r = _redis()
    data = r.get(f"{_TOKEN_PREFIX}{token}")
    if data:
        reset_token = _deserialize_token(data)
        r.delete(f"{_USER_PREFIX}{reset_token.user_id}")
    r.delete(f"{_TOKEN_PREFIX}{token}")


# Legacy class interface preserved for backward compatibility with tests
# that access get_password_reset_service().
class PasswordResetService:
    """Thin wrapper that delegates to module-level functions.

    Kept so that existing integration tests calling
    ``get_password_reset_service().generate_token(...)`` continue
    to work without changes.
    """

    TOKEN_EXPIRY_HOURS: int = TOKEN_EXPIRY_HOURS

    def generate_token(self, user_id: str, email: str) -> PasswordResetToken:
        return generate_token(user_id, email)

    def verify_token(self, token: str) -> PasswordResetToken | None:
        return verify_token(token)

    def consume_token(self, token: str) -> PasswordResetToken | None:
        return consume_token(token)

    def invalidate_user_tokens(self, user_id: str) -> None:
        invalidate_user_tokens(user_id)


_password_reset_service: PasswordResetService | None = None


def get_password_reset_service() -> PasswordResetService:
    """Get or create the application PasswordResetService instance."""
    global _password_reset_service
    if _password_reset_service is None:
        _password_reset_service = PasswordResetService()
    return _password_reset_service
