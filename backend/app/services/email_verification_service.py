"""Email verification token service.

Handles generation, storage, and validation of email verification tokens.
Tokens expire after 24 hours and are stored in Redis so they survive
container restarts and work across horizontally-scaled instances.
"""

import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import NamedTuple

import redis as redis_lib

from app.core.config import settings


class VerificationToken(NamedTuple):
    """Email verification token data."""

    token: str
    user_id: str
    email: str
    expires_at: datetime
    created_at: datetime


# Constants
TOKEN_EXPIRY_HOURS: int = 24
_TOKEN_LENGTH: int = 32
_TOKEN_PREFIX = "emailverify:token:"
_USER_PREFIX = "emailverify:user:"

# Module-level Redis client (lazily initialised)
_redis_client: redis_lib.Redis | None = None


def _redis() -> redis_lib.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def _serialize_token(token: VerificationToken) -> str:
    """Serialize a VerificationToken to a JSON string for Redis storage."""
    return json.dumps(
        {
            "token": token.token,
            "user_id": token.user_id,
            "email": token.email,
            "expires_at": token.expires_at.isoformat(),
            "created_at": token.created_at.isoformat(),
        }
    )


def _deserialize_token(data: str) -> VerificationToken:
    """Deserialize a JSON string from Redis to a VerificationToken."""
    parsed = json.loads(data)
    return VerificationToken(
        token=parsed["token"],
        user_id=parsed["user_id"],
        email=parsed["email"],
        expires_at=datetime.fromisoformat(parsed["expires_at"]),
        created_at=datetime.fromisoformat(parsed["created_at"]),
    )


def generate_token(user_id: str, email: str) -> VerificationToken:
    """Generate a new email verification token.

    If a token already exists for the user, it is invalidated
    and a new one is created.

    Args:
        user_id: The user's ID.
        email: The email address to verify.

    Returns:
        VerificationToken with the generated token data.
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

    verification_token = VerificationToken(
        token=token,
        user_id=user_id,
        email=email,
        expires_at=expires_at,
        created_at=now,
    )

    # Store token → data and user → token mappings with TTL
    pipe = r.pipeline()
    pipe.setex(
        f"{_TOKEN_PREFIX}{token}", ttl_seconds, _serialize_token(verification_token)
    )
    pipe.setex(f"{_USER_PREFIX}{user_id}", ttl_seconds, token)
    pipe.execute()

    return verification_token


def verify_token(token: str) -> VerificationToken | None:
    """Verify an email verification token.

    Checks if the token exists and is not expired.
    Does NOT consume the token — call consume_token after successful
    verification.

    Args:
        token: The verification token to check.

    Returns:
        VerificationToken if valid, None if invalid or expired.
    """
    data = _redis().get(f"{_TOKEN_PREFIX}{token}")
    if data is None:
        return None

    verification_token = _deserialize_token(data)

    # Double-check expiration (Redis TTL handles cleanup, but be safe)
    if datetime.now(timezone.utc) >= verification_token.expires_at:
        _cleanup_token(token)
        return None

    return verification_token


def consume_token(token: str) -> VerificationToken | None:
    """Verify and consume an email verification token.

    The token is invalidated after successful verification.

    Args:
        token: The verification token to consume.

    Returns:
        VerificationToken if valid, None if invalid or expired.
    """
    verification_token = verify_token(token)
    if verification_token is None:
        return None

    _cleanup_token(token)
    return verification_token


def get_token_for_user(user_id: str) -> VerificationToken | None:
    """Get the current verification token for a user.

    Args:
        user_id: The user's ID.

    Returns:
        VerificationToken if exists and not expired, None otherwise.
    """
    r = _redis()
    token = r.get(f"{_USER_PREFIX}{user_id}")
    if token is None:
        return None
    return verify_token(token)


def invalidate_user_tokens(user_id: str) -> None:
    """Invalidate all tokens for a user.

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
        verification_token = _deserialize_token(data)
        r.delete(f"{_USER_PREFIX}{verification_token.user_id}")
    r.delete(f"{_TOKEN_PREFIX}{token}")


# Legacy class interface preserved for backward compatibility with tests
# that access get_email_verification_service().
class EmailVerificationService:
    """Thin wrapper that delegates to module-level functions.

    Kept so that existing integration tests calling
    ``get_email_verification_service().get_token_for_user(...)`` continue
    to work without changes.
    """

    TOKEN_EXPIRY_HOURS: int = TOKEN_EXPIRY_HOURS

    def generate_token(self, user_id: str, email: str) -> VerificationToken:
        return generate_token(user_id, email)

    def verify_token(self, token: str) -> VerificationToken | None:
        return verify_token(token)

    def consume_token(self, token: str) -> VerificationToken | None:
        return consume_token(token)

    def get_token_for_user(self, user_id: str) -> VerificationToken | None:
        return get_token_for_user(user_id)

    def invalidate_user_tokens(self, user_id: str) -> None:
        invalidate_user_tokens(user_id)


_email_verification_service: EmailVerificationService | None = None


def get_email_verification_service() -> EmailVerificationService:
    """Get or create the application EmailVerificationService instance."""
    global _email_verification_service
    if _email_verification_service is None:
        _email_verification_service = EmailVerificationService()
    return _email_verification_service
