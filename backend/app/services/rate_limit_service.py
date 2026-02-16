"""Rate limiting service for login attempts.

Implements a sliding window rate limiter to prevent brute force attacks.
After 5 failed attempts, the account is locked for 15 minutes.
"""

from datetime import datetime, timedelta, timezone
from typing import NamedTuple


class RateLimitInfo(NamedTuple):
    """Information about rate limit status."""

    is_locked: bool
    attempts_remaining: int
    lockout_expires_at: datetime | None


class LoginRateLimiter:
    """Rate limiter for login attempts.

    Tracks failed login attempts per identifier (usually email).
    After MAX_ATTEMPTS failed attempts within the window, the identifier
    is locked out for LOCKOUT_DURATION.

    In production, this should be replaced with Redis storage for
    persistence and horizontal scaling.
    """

    MAX_ATTEMPTS: int = 5
    LOCKOUT_DURATION: timedelta = timedelta(minutes=15)
    ATTEMPT_WINDOW: timedelta = timedelta(minutes=15)

    def __init__(self) -> None:
        # Maps identifier to list of failed attempt timestamps
        self._attempts: dict[str, list[datetime]] = {}
        # Maps identifier to lockout expiration time
        self._lockouts: dict[str, datetime] = {}

    def _cleanup_old_attempts(self, identifier: str) -> None:
        """Remove attempts older than the window."""
        if identifier not in self._attempts:
            return

        cutoff = datetime.now(timezone.utc) - self.ATTEMPT_WINDOW
        self._attempts[identifier] = [
            ts for ts in self._attempts[identifier] if ts > cutoff
        ]

    def is_locked(self, identifier: str) -> bool:
        """Check if identifier is currently locked out.

        Args:
            identifier: The identifier to check (e.g., email address).

        Returns:
            True if locked out, False otherwise.
        """
        if identifier not in self._lockouts:
            return False

        lockout_expires = self._lockouts[identifier]
        if datetime.now(timezone.utc) >= lockout_expires:
            # Lockout expired, clean up
            del self._lockouts[identifier]
            if identifier in self._attempts:
                del self._attempts[identifier]
            return False

        return True

    def record_failed_attempt(self, identifier: str) -> RateLimitInfo:
        """Record a failed login attempt.

        Args:
            identifier: The identifier (e.g., email address).

        Returns:
            RateLimitInfo with current status.
        """
        now = datetime.now(timezone.utc)

        # Check if already locked
        if self.is_locked(identifier):
            return RateLimitInfo(
                is_locked=True,
                attempts_remaining=0,
                lockout_expires_at=self._lockouts.get(identifier),
            )

        # Initialize if needed
        if identifier not in self._attempts:
            self._attempts[identifier] = []

        # Clean up old attempts
        self._cleanup_old_attempts(identifier)

        # Record this attempt
        self._attempts[identifier].append(now)
        attempt_count = len(self._attempts[identifier])

        # Check if we should lock
        if attempt_count >= self.MAX_ATTEMPTS:
            lockout_expires = now + self.LOCKOUT_DURATION
            self._lockouts[identifier] = lockout_expires
            return RateLimitInfo(
                is_locked=True,
                attempts_remaining=0,
                lockout_expires_at=lockout_expires,
            )

        return RateLimitInfo(
            is_locked=False,
            attempts_remaining=self.MAX_ATTEMPTS - attempt_count,
            lockout_expires_at=None,
        )

    def record_successful_login(self, identifier: str) -> None:
        """Clear failed attempts after successful login.

        Args:
            identifier: The identifier (e.g., email address).
        """
        if identifier in self._attempts:
            del self._attempts[identifier]
        if identifier in self._lockouts:
            del self._lockouts[identifier]

    def get_status(self, identifier: str) -> RateLimitInfo:
        """Get current rate limit status for identifier.

        Args:
            identifier: The identifier (e.g., email address).

        Returns:
            RateLimitInfo with current status.
        """
        if self.is_locked(identifier):
            return RateLimitInfo(
                is_locked=True,
                attempts_remaining=0,
                lockout_expires_at=self._lockouts.get(identifier),
            )

        self._cleanup_old_attempts(identifier)
        attempt_count = len(self._attempts.get(identifier, []))

        return RateLimitInfo(
            is_locked=False,
            attempts_remaining=self.MAX_ATTEMPTS - attempt_count,
            lockout_expires_at=None,
        )

    def reset(self, identifier: str) -> None:
        """Reset rate limit for identifier (admin use).

        Args:
            identifier: The identifier to reset.
        """
        if identifier in self._attempts:
            del self._attempts[identifier]
        if identifier in self._lockouts:
            del self._lockouts[identifier]


# Singleton instance
_rate_limiter: LoginRateLimiter | None = None


def get_login_rate_limiter() -> LoginRateLimiter:
    """Get or create the application rate limiter instance.

    Returns:
        Configured LoginRateLimiter instance.
    """
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = LoginRateLimiter()
    return _rate_limiter
