"""JWT Authentication Service.

Provides JWT token generation, validation, and blacklisting for user authentication.
Supports access tokens, refresh tokens, and "remember me" functionality.
"""
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from functools import lru_cache
from typing import Any

import jwt
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel

from app.core.config import settings


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


class TokenBlacklist:
    """In-memory token blacklist for invalidated tokens.

    In production, this should be replaced with Redis or database storage
    for persistence across server restarts and horizontal scaling.
    """

    def __init__(self) -> None:
        self._blacklisted: set[str] = set()

    def add(self, jti: str) -> None:
        """Add a token ID to the blacklist."""
        self._blacklisted.add(jti)

    def is_blacklisted(self, jti: str) -> bool:
        """Check if a token ID is blacklisted."""
        return jti in self._blacklisted


class AuthService:
    """JWT Authentication Service.

    Handles JWT token generation, validation, refresh, and blacklisting.

    Attributes:
        ACCESS_TOKEN_EXPIRE_HOURS: Default expiration for access tokens (24 hours).
        REFRESH_TOKEN_EXPIRE_DAYS: Default expiration for refresh tokens (7 days).
        REMEMBER_ME_EXPIRE_DAYS: Expiration for "remember me" tokens (30 days).
    """

    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REMEMBER_ME_EXPIRE_DAYS: int = 30

    def __init__(self, secret_key: str, algorithm: str = "HS256") -> None:
        """Initialize the auth service.

        Args:
            secret_key: Secret key for JWT encoding/decoding.
            algorithm: JWT algorithm to use (default: HS256).
        """
        self._secret_key = secret_key
        self._algorithm = algorithm
        self._blacklist = TokenBlacklist()

    def create_access_token(
        self,
        subject: str,
        expires_delta: timedelta | None = None,
        remember_me: bool = False,
    ) -> str:
        """Create a new access token.

        Args:
            subject: The subject (user ID) for the token.
            expires_delta: Custom expiration time. Defaults to 24 hours.
            remember_me: If True, token expires in 30 days instead of 24 hours.

        Returns:
            Encoded JWT access token.
        """
        if expires_delta is not None:
            expire = datetime.now(timezone.utc) + expires_delta
        elif remember_me:
            expire = datetime.now(timezone.utc) + timedelta(
                days=self.REMEMBER_ME_EXPIRE_DAYS
            )
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                hours=self.ACCESS_TOKEN_EXPIRE_HOURS
            )

        to_encode: dict[str, Any] = {
            "sub": subject,
            "type": TokenType.ACCESS.value,
            "exp": expire,
        }

        return jwt.encode(to_encode, self._secret_key, algorithm=self._algorithm)

    def create_refresh_token(
        self,
        subject: str,
        expires_delta: timedelta | None = None,
    ) -> str:
        """Create a new refresh token.

        Refresh tokens include a unique identifier (jti) for blacklisting
        on logout.

        Args:
            subject: The subject (user ID) for the token.
            expires_delta: Custom expiration time. Defaults to 7 days.

        Returns:
            Encoded JWT refresh token.
        """
        if expires_delta is not None:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                days=self.REFRESH_TOKEN_EXPIRE_DAYS
            )

        jti = str(uuid.uuid4())

        to_encode: dict[str, Any] = {
            "sub": subject,
            "type": TokenType.REFRESH.value,
            "exp": expire,
            "jti": jti,
        }

        return jwt.encode(to_encode, self._secret_key, algorithm=self._algorithm)

    def decode_token(self, token: str) -> dict[str, Any] | None:
        """Decode and validate a JWT token.

        Args:
            token: The JWT token to decode.

        Returns:
            Decoded token payload if valid, None if invalid or expired.
        """
        try:
            payload = jwt.decode(
                token,
                self._secret_key,
                algorithms=[self._algorithm],
            )
            return payload
        except InvalidTokenError:
            return None

    def verify_token(self, token: str) -> TokenData | None:
        """Verify a token and return structured token data.

        Checks token validity, expiration, and blacklist status.

        Args:
            token: The JWT token to verify.

        Returns:
            TokenData if valid, None if invalid, expired, or blacklisted.
        """
        payload = self.decode_token(token)
        if payload is None:
            return None

        # Check if token is blacklisted (for refresh tokens)
        jti = payload.get("jti")
        if jti and self.is_token_blacklisted(jti):
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

    def blacklist_token(self, jti: str) -> None:
        """Add a token to the blacklist.

        Args:
            jti: The unique token identifier to blacklist.
        """
        self._blacklist.add(jti)

    def is_token_blacklisted(self, jti: str) -> bool:
        """Check if a token is blacklisted.

        Args:
            jti: The unique token identifier to check.

        Returns:
            True if the token is blacklisted, False otherwise.
        """
        return self._blacklist.is_blacklisted(jti)

    def refresh_access_token(self, refresh_token: str) -> str | None:
        """Create a new access token from a valid refresh token.

        Args:
            refresh_token: A valid refresh token.

        Returns:
            New access token if refresh token is valid, None otherwise.
        """
        token_data = self.verify_token(refresh_token)
        if token_data is None:
            return None

        # Only refresh tokens can be used for refresh
        if token_data.type != TokenType.REFRESH:
            return None

        return self.create_access_token(subject=token_data.sub)

    def logout(self, refresh_token: str) -> bool:
        """Logout by blacklisting the refresh token.

        Args:
            refresh_token: The refresh token to invalidate.

        Returns:
            True if logout successful, False if token was invalid.
        """
        payload = self.decode_token(refresh_token)
        if payload is None:
            return False

        jti = payload.get("jti")
        if jti:
            self.blacklist_token(jti)
            return True

        return False


# Singleton instance for the application
_auth_service: AuthService | None = None


def get_auth_service() -> AuthService:
    """Get or create the application AuthService instance.

    Returns a singleton AuthService configured with application settings.
    The instance is created lazily on first call.

    Returns:
        Configured AuthService instance.
    """
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService(
            secret_key=settings.SECRET_KEY,
            algorithm="HS256",
        )
        # Apply settings to the instance
        _auth_service.ACCESS_TOKEN_EXPIRE_HOURS = settings.ACCESS_TOKEN_EXPIRE_HOURS
        _auth_service.REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
        _auth_service.REMEMBER_ME_EXPIRE_DAYS = settings.REMEMBER_ME_EXPIRE_DAYS
    return _auth_service
