"""Email verification token service.

Handles generation, storage, and validation of email verification tokens.
Tokens expire after 24 hours.
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import NamedTuple


class VerificationToken(NamedTuple):
    """Email verification token data."""

    token: str
    user_id: str
    email: str
    expires_at: datetime
    created_at: datetime


class EmailVerificationService:
    """Service for managing email verification tokens.

    Handles token generation, storage, and validation.
    Tokens are stored in-memory; production should use Redis or database.

    Attributes:
        TOKEN_EXPIRY_HOURS: Token validity period (24 hours).
        TOKEN_LENGTH: Length of generated token (32 bytes = 64 hex chars).
    """

    TOKEN_EXPIRY_HOURS: int = 24
    TOKEN_LENGTH: int = 32

    def __init__(self) -> None:
        # Maps token -> VerificationToken
        self._tokens: dict[str, VerificationToken] = {}
        # Maps user_id -> token (for resend functionality)
        self._user_tokens: dict[str, str] = {}

    def generate_token(self, user_id: str, email: str) -> VerificationToken:
        """Generate a new email verification token.

        If a token already exists for the user, it is invalidated
        and a new one is created.

        Args:
            user_id: The user's ID.
            email: The email address to verify.

        Returns:
            VerificationToken with the generated token data.
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

        verification_token = VerificationToken(
            token=token,
            user_id=user_id,
            email=email,
            expires_at=expires_at,
            created_at=now,
        )

        # Store token
        self._tokens[token] = verification_token
        self._user_tokens[user_id] = token

        return verification_token

    def verify_token(self, token: str) -> VerificationToken | None:
        """Verify an email verification token.

        Checks if the token exists, is not expired, and returns the token data.
        Does NOT consume the token - call consume_token after successful verification.

        Args:
            token: The verification token to check.

        Returns:
            VerificationToken if valid, None if invalid or expired.
        """
        if token not in self._tokens:
            return None

        verification_token = self._tokens[token]

        # Check expiration
        if datetime.now(timezone.utc) >= verification_token.expires_at:
            # Token expired, clean up
            self._cleanup_token(token)
            return None

        return verification_token

    def consume_token(self, token: str) -> VerificationToken | None:
        """Verify and consume an email verification token.

        The token is invalidated after successful verification.

        Args:
            token: The verification token to consume.

        Returns:
            VerificationToken if valid, None if invalid or expired.
        """
        verification_token = self.verify_token(token)
        if verification_token is None:
            return None

        # Remove the token (one-time use)
        self._cleanup_token(token)
        return verification_token

    def _cleanup_token(self, token: str) -> None:
        """Remove a token from storage."""
        if token in self._tokens:
            verification_token = self._tokens[token]
            user_id = verification_token.user_id

            del self._tokens[token]
            if user_id in self._user_tokens and self._user_tokens[user_id] == token:
                del self._user_tokens[user_id]

    def get_token_for_user(self, user_id: str) -> VerificationToken | None:
        """Get the current verification token for a user.

        Args:
            user_id: The user's ID.

        Returns:
            VerificationToken if exists and not expired, None otherwise.
        """
        if user_id not in self._user_tokens:
            return None

        token = self._user_tokens[user_id]
        return self.verify_token(token)

    def invalidate_user_tokens(self, user_id: str) -> None:
        """Invalidate all tokens for a user.

        Args:
            user_id: The user's ID.
        """
        if user_id in self._user_tokens:
            token = self._user_tokens[user_id]
            self._cleanup_token(token)


# Singleton instance
_email_verification_service: EmailVerificationService | None = None


def get_email_verification_service() -> EmailVerificationService:
    """Get or create the application EmailVerificationService instance.

    Returns:
        Configured EmailVerificationService instance.
    """
    global _email_verification_service
    if _email_verification_service is None:
        _email_verification_service = EmailVerificationService()
    return _email_verification_service
