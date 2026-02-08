"""Tests for JWT Authentication Service."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.services.auth_service import (
    AuthService,
    TokenBlacklist,
    TokenData,
    TokenType,
)


class TestTokenType:
    """Test TokenType enum."""

    def test_token_type_values(self) -> None:
        """TokenType enum should have access and refresh types."""
        assert TokenType.ACCESS.value == "access"
        assert TokenType.REFRESH.value == "refresh"


class TestTokenData:
    """Test TokenData model."""

    def test_token_data_creation(self) -> None:
        """TokenData should be creatable with required fields."""
        user_id = uuid.uuid4()
        token_data = TokenData(
            sub=str(user_id),
            type=TokenType.ACCESS,
            exp=datetime.now(timezone.utc) + timedelta(hours=1),
        )

        assert token_data.sub == str(user_id)
        assert token_data.type == TokenType.ACCESS
        assert token_data.exp is not None

    def test_token_data_with_jti(self) -> None:
        """TokenData should support jti for token identification."""
        token_data = TokenData(
            sub="user-id",
            type=TokenType.REFRESH,
            exp=datetime.now(timezone.utc) + timedelta(days=7),
            jti="unique-token-id",
        )

        assert token_data.jti == "unique-token-id"


class TestTokenBlacklist:
    """Test in-memory token blacklist."""

    def test_blacklist_add_token(self) -> None:
        """Should be able to add token to blacklist."""
        blacklist = TokenBlacklist()
        jti = "token-123"

        blacklist.add(jti)

        assert blacklist.is_blacklisted(jti) is True

    def test_blacklist_check_non_blacklisted(self) -> None:
        """Non-blacklisted tokens should return False."""
        blacklist = TokenBlacklist()

        assert blacklist.is_blacklisted("unknown-token") is False

    def test_blacklist_multiple_tokens(self) -> None:
        """Should handle multiple blacklisted tokens."""
        blacklist = TokenBlacklist()
        blacklist.add("token-1")
        blacklist.add("token-2")

        assert blacklist.is_blacklisted("token-1") is True
        assert blacklist.is_blacklisted("token-2") is True
        assert blacklist.is_blacklisted("token-3") is False


class TestAuthService:
    """Test AuthService JWT functionality."""

    @pytest.fixture
    def auth_service(self) -> AuthService:
        """Create AuthService instance for testing."""
        return AuthService(
            secret_key="test-secret-key-for-testing-purposes-only",
            algorithm="HS256",
        )

    @pytest.fixture
    def user_id(self) -> uuid.UUID:
        """Sample user ID for testing."""
        return uuid.uuid4()

    def test_create_access_token(self, auth_service: AuthService, user_id: uuid.UUID) -> None:
        """Should create valid access token."""
        token = auth_service.create_access_token(subject=str(user_id))

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_default_expiration(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Access token should have 24-hour default expiration."""
        token = auth_service.create_access_token(subject=str(user_id))
        decoded = auth_service.decode_token(token)

        assert decoded is not None
        exp_time = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)

        # Should expire in approximately 24 hours (with some tolerance)
        time_diff = exp_time - now
        assert timedelta(hours=23) < time_diff < timedelta(hours=25)

    def test_create_access_token_custom_expiration(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Should allow custom expiration for access token."""
        expires_delta = timedelta(hours=2)
        token = auth_service.create_access_token(
            subject=str(user_id), expires_delta=expires_delta
        )
        decoded = auth_service.decode_token(token)

        assert decoded is not None
        exp_time = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)

        time_diff = exp_time - now
        assert timedelta(hours=1, minutes=59) < time_diff < timedelta(hours=2, minutes=1)

    def test_create_access_token_remember_me(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Remember me should create 30-day token."""
        token = auth_service.create_access_token(
            subject=str(user_id), remember_me=True
        )
        decoded = auth_service.decode_token(token)

        assert decoded is not None
        exp_time = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)

        time_diff = exp_time - now
        assert timedelta(days=29) < time_diff < timedelta(days=31)

    def test_create_refresh_token(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Should create valid refresh token."""
        token = auth_service.create_refresh_token(subject=str(user_id))

        assert token is not None
        assert isinstance(token, str)
        decoded = auth_service.decode_token(token)
        assert decoded is not None
        assert decoded["type"] == TokenType.REFRESH.value

    def test_refresh_token_has_longer_expiration(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Refresh token should have 7-day expiration by default."""
        token = auth_service.create_refresh_token(subject=str(user_id))
        decoded = auth_service.decode_token(token)

        assert decoded is not None
        exp_time = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)

        time_diff = exp_time - now
        assert timedelta(days=6) < time_diff < timedelta(days=8)

    def test_refresh_token_has_jti(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Refresh token should have unique jti for blacklisting."""
        token = auth_service.create_refresh_token(subject=str(user_id))
        decoded = auth_service.decode_token(token)

        assert decoded is not None
        assert "jti" in decoded
        assert decoded["jti"] is not None
        assert len(decoded["jti"]) > 0

    def test_decode_valid_token(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Should decode valid token and return payload."""
        token = auth_service.create_access_token(subject=str(user_id))
        decoded = auth_service.decode_token(token)

        assert decoded is not None
        assert decoded["sub"] == str(user_id)
        assert decoded["type"] == TokenType.ACCESS.value

    def test_decode_invalid_token(self, auth_service: AuthService) -> None:
        """Should return None for invalid token."""
        decoded = auth_service.decode_token("invalid.token.here")

        assert decoded is None

    def test_decode_expired_token(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Should return None for expired token."""
        token = auth_service.create_access_token(
            subject=str(user_id), expires_delta=timedelta(seconds=-1)
        )
        decoded = auth_service.decode_token(token)

        assert decoded is None

    def test_decode_token_wrong_secret(self, user_id: uuid.UUID) -> None:
        """Should return None when decoded with wrong secret."""
        service1 = AuthService(secret_key="secret-1", algorithm="HS256")
        service2 = AuthService(secret_key="secret-2", algorithm="HS256")

        token = service1.create_access_token(subject=str(user_id))
        decoded = service2.decode_token(token)

        assert decoded is None

    def test_verify_token_valid(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Should return TokenData for valid token."""
        token = auth_service.create_access_token(subject=str(user_id))
        token_data = auth_service.verify_token(token)

        assert token_data is not None
        assert token_data.sub == str(user_id)
        assert token_data.type == TokenType.ACCESS

    def test_verify_token_invalid(self, auth_service: AuthService) -> None:
        """Should return None for invalid token."""
        token_data = auth_service.verify_token("invalid.token")

        assert token_data is None

    def test_verify_token_checks_blacklist(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Should return None for blacklisted token."""
        token = auth_service.create_refresh_token(subject=str(user_id))
        decoded = auth_service.decode_token(token)
        assert decoded is not None

        # Blacklist the token
        auth_service.blacklist_token(decoded["jti"])

        # Verify should now fail
        token_data = auth_service.verify_token(token)
        assert token_data is None

    def test_blacklist_token(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Should be able to blacklist a token."""
        token = auth_service.create_refresh_token(subject=str(user_id))
        decoded = auth_service.decode_token(token)
        assert decoded is not None
        jti = decoded["jti"]

        auth_service.blacklist_token(jti)

        assert auth_service.is_token_blacklisted(jti) is True

    def test_refresh_access_token(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Should create new access token from valid refresh token."""
        refresh_token = auth_service.create_refresh_token(subject=str(user_id))
        new_access_token = auth_service.refresh_access_token(refresh_token)

        assert new_access_token is not None
        decoded = auth_service.decode_token(new_access_token)
        assert decoded is not None
        assert decoded["sub"] == str(user_id)
        assert decoded["type"] == TokenType.ACCESS.value

    def test_refresh_access_token_invalid_refresh(
        self, auth_service: AuthService
    ) -> None:
        """Should return None for invalid refresh token."""
        new_token = auth_service.refresh_access_token("invalid.refresh.token")

        assert new_token is None

    def test_refresh_access_token_with_access_token(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Should return None when trying to refresh with access token."""
        access_token = auth_service.create_access_token(subject=str(user_id))
        new_token = auth_service.refresh_access_token(access_token)

        assert new_token is None

    def test_refresh_access_token_blacklisted(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Should return None for blacklisted refresh token."""
        refresh_token = auth_service.create_refresh_token(subject=str(user_id))
        decoded = auth_service.decode_token(refresh_token)
        assert decoded is not None

        auth_service.blacklist_token(decoded["jti"])
        new_token = auth_service.refresh_access_token(refresh_token)

        assert new_token is None

    def test_logout_blacklists_refresh_token(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Logout should blacklist the refresh token."""
        refresh_token = auth_service.create_refresh_token(subject=str(user_id))
        decoded = auth_service.decode_token(refresh_token)
        assert decoded is not None
        jti = decoded["jti"]

        auth_service.logout(refresh_token)

        assert auth_service.is_token_blacklisted(jti) is True

    def test_token_contains_type_claim(
        self, auth_service: AuthService, user_id: uuid.UUID
    ) -> None:
        """Tokens should contain type claim to distinguish access vs refresh."""
        access_token = auth_service.create_access_token(subject=str(user_id))
        refresh_token = auth_service.create_refresh_token(subject=str(user_id))

        access_decoded = auth_service.decode_token(access_token)
        refresh_decoded = auth_service.decode_token(refresh_token)

        assert access_decoded is not None
        assert refresh_decoded is not None
        assert access_decoded["type"] == TokenType.ACCESS.value
        assert refresh_decoded["type"] == TokenType.REFRESH.value
