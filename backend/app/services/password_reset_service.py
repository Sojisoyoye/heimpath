"""Password reset token service.

Handles generation, storage, and validation of password reset tokens.
Tokens expire after 1 hour for security.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import NamedTuple


class PasswordResetToken(NamedTuple):
    """Password reset token data."""

    token: str
    user_id: str
    email: str
    expires_at: datetime
    created_at: datetime


class PasswordResetService:
    """Service for managing password reset tokens.

    Handles token generation, storage, and validation.
    Tokens are stored in-memory; production should use Redis or database.

    Attributes:
        TOKEN_EXPIRY_HOURS: Token validity period (1 hour).
        TOKEN_LENGTH: Length of generated token (32 bytes = 64 hex chars).
    """

    TOKEN_EXPIRY_HOURS: int = 1
    TOKEN_LENGTH: int = 32

    def __init__(self) -> None:
        # Maps token -> PasswordResetToken
        self._tokens: dict[str, PasswordResetToken] = {}
        # Maps user_id -> token (only one active reset token per user)
        self._user_tokens: dict[str, str] = {}

    def generate_token(self, user_id: str, email: str) -> PasswordResetToken:
        """Generate a new password reset token.

        If a token already exists for the user, it is invalidated
        and a new one is created.

        Args:
            user_id: The user's ID.
            email: The user's email address.

        Returns:
            PasswordResetToken with the generated token data.
        """
        # Invalidate any existing token for this user
        if user_id in self._user_tokens:
            old_token = self._user_tokens[user_id]
            if old_token in self._tokens:
                del self._tokens[old_token]

        # Generate new token
        token = secrets.token_hex(self.TOKEN_LENGTH)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=self.TOKEN_EXPIRY_HOURS)

        reset_token = PasswordResetToken(
            token=token,
            user_id=user_id,
            email=email,
            expires_at=expires_at,
            created_at=now,
        )

        # Store token
        self._tokens[token] = reset_token
        self._user_tokens[user_id] = token

        return reset_token

    def verify_token(self, token: str) -> PasswordResetToken | None:
        """Verify a password reset token.

        Checks if the token exists and is not expired.
        Does NOT consume the token.

        Args:
            token: The reset token to check.

        Returns:
            PasswordResetToken if valid, None if invalid or expired.
        """
        if token not in self._tokens:
            return None

        reset_token = self._tokens[token]

        # Check expiration
        if datetime.now(timezone.utc) >= reset_token.expires_at:
            # Token expired, clean up
            self._cleanup_token(token)
            return None

        return reset_token

    def consume_token(self, token: str) -> PasswordResetToken | None:
        """Verify and consume a password reset token.

        The token is invalidated after successful verification.

        Args:
            token: The reset token to consume.

        Returns:
            PasswordResetToken if valid, None if invalid or expired.
        """
        reset_token = self.verify_token(token)
        if reset_token is None:
            return None

        # Remove the token (one-time use)
        self._cleanup_token(token)
        return reset_token

    def _cleanup_token(self, token: str) -> None:
        """Remove a token from storage."""
        if token in self._tokens:
            reset_token = self._tokens[token]
            user_id = reset_token.user_id

            del self._tokens[token]
            if user_id in self._user_tokens and self._user_tokens[user_id] == token:
                del self._user_tokens[user_id]

    def invalidate_user_tokens(self, user_id: str) -> None:
        """Invalidate all reset tokens for a user.

        Called after successful password reset.

        Args:
            user_id: The user's ID.
        """
        if user_id in self._user_tokens:
            token = self._user_tokens[user_id]
            self._cleanup_token(token)


# Singleton instance
_password_reset_service: PasswordResetService | None = None


def get_password_reset_service() -> PasswordResetService:
    """Get or create the application PasswordResetService instance.

    Returns:
        Configured PasswordResetService instance.
    """
    global _password_reset_service
    if _password_reset_service is None:
        _password_reset_service = PasswordResetService()
    return _password_reset_service
