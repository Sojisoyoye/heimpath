"""Tests for Authentication Schemas."""
import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    AuthToken,
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    VerifyEmailRequest,
    VerifyEmailResponse,
)


class TestRegisterRequest:
    """Test RegisterRequest schema validation."""

    def test_valid_registration(self) -> None:
        """Should accept valid registration data."""
        request = RegisterRequest(
            email="user@example.com",
            password="Password1",
            full_name="Test User",
            citizenship="German",
        )

        assert request.email == "user@example.com"
        assert request.password == "Password1"
        assert request.full_name == "Test User"
        assert request.citizenship == "German"

    def test_valid_registration_minimal(self) -> None:
        """Should accept registration with only required fields."""
        request = RegisterRequest(
            email="user@example.com",
            password="Password1",
        )

        assert request.email == "user@example.com"
        assert request.full_name is None
        assert request.citizenship is None

    def test_password_requires_uppercase(self) -> None:
        """Should reject password without uppercase letter."""
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                email="user@example.com",
                password="password1",  # no uppercase
            )

        assert "uppercase" in str(exc_info.value).lower()

    def test_password_requires_number(self) -> None:
        """Should reject password without number."""
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                email="user@example.com",
                password="Password",  # no number
            )

        assert "number" in str(exc_info.value).lower()

    def test_password_minimum_length(self) -> None:
        """Should reject password shorter than 8 characters."""
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                email="user@example.com",
                password="Pass1",  # too short
            )

        assert "8" in str(exc_info.value) or "min" in str(exc_info.value).lower()

    def test_password_maximum_length(self) -> None:
        """Should reject password longer than 128 characters."""
        long_password = "A" * 127 + "1"  # 128 chars, valid
        request = RegisterRequest(
            email="user@example.com",
            password=long_password,
        )
        assert len(request.password) == 128

        with pytest.raises(ValidationError):
            RegisterRequest(
                email="user@example.com",
                password="A" * 128 + "1",  # 129 chars, invalid
            )

    def test_invalid_email_format(self) -> None:
        """Should reject invalid email format."""
        with pytest.raises(ValidationError):
            RegisterRequest(
                email="not-an-email",
                password="Password1",
            )

    def test_email_max_length(self) -> None:
        """Should reject email longer than 255 characters."""
        long_email = "a" * 250 + "@b.com"  # > 255 chars
        with pytest.raises(ValidationError):
            RegisterRequest(
                email=long_email,
                password="Password1",
            )


class TestLoginRequest:
    """Test LoginRequest schema validation."""

    def test_valid_login(self) -> None:
        """Should accept valid login data."""
        request = LoginRequest(
            email="user@example.com",
            password="anypassword",
            remember_me=False,
        )

        assert request.email == "user@example.com"
        assert request.password == "anypassword"
        assert request.remember_me is False

    def test_remember_me_defaults_false(self) -> None:
        """remember_me should default to False."""
        request = LoginRequest(
            email="user@example.com",
            password="anypassword",
        )

        assert request.remember_me is False

    def test_remember_me_true(self) -> None:
        """Should accept remember_me=True."""
        request = LoginRequest(
            email="user@example.com",
            password="anypassword",
            remember_me=True,
        )

        assert request.remember_me is True

    def test_login_no_password_validation(self) -> None:
        """Login should not enforce password strength (only registration)."""
        # This should work - we validate credentials, not strength
        request = LoginRequest(
            email="user@example.com",
            password="weak",  # no uppercase, no number, short - OK for login
        )

        assert request.password == "weak"

    def test_invalid_email(self) -> None:
        """Should reject invalid email format."""
        with pytest.raises(ValidationError):
            LoginRequest(
                email="not-an-email",
                password="password",
            )


class TestAuthToken:
    """Test AuthToken schema."""

    def test_auth_token_creation(self) -> None:
        """Should create AuthToken with all fields."""
        token = AuthToken(
            access_token="access_token_here",
            refresh_token="refresh_token_here",
        )

        assert token.access_token == "access_token_here"
        assert token.refresh_token == "refresh_token_here"
        assert token.token_type == "bearer"

    def test_token_type_default(self) -> None:
        """token_type should default to 'bearer'."""
        token = AuthToken(
            access_token="access",
            refresh_token="refresh",
        )

        assert token.token_type == "bearer"


class TestRefreshTokenRequest:
    """Test RefreshTokenRequest schema."""

    def test_refresh_token_request(self) -> None:
        """Should accept refresh token."""
        request = RefreshTokenRequest(refresh_token="some_refresh_token")

        assert request.refresh_token == "some_refresh_token"


class TestLogoutRequest:
    """Test LogoutRequest schema."""

    def test_logout_request(self) -> None:
        """Should accept refresh token for logout."""
        request = LogoutRequest(refresh_token="some_refresh_token")

        assert request.refresh_token == "some_refresh_token"


class TestVerifyEmailRequest:
    """Test VerifyEmailRequest schema."""

    def test_valid_request(self) -> None:
        """Should accept valid verification token."""
        request = VerifyEmailRequest(token="verification-token-here")

        assert request.token == "verification-token-here"

    def test_empty_token_rejected(self) -> None:
        """Should reject empty token."""
        with pytest.raises(ValidationError):
            VerifyEmailRequest(token="")


class TestVerifyEmailResponse:
    """Test VerifyEmailResponse schema."""

    def test_verified_response(self) -> None:
        """Should create verified response."""
        response = VerifyEmailResponse(
            message="Email verified successfully",
            email_verified=True,
        )

        assert response.message == "Email verified successfully"
        assert response.email_verified is True

    def test_not_verified_response(self) -> None:
        """Should create not verified response."""
        response = VerifyEmailResponse(
            message="Verification link sent",
            email_verified=False,
        )

        assert response.email_verified is False


class TestResendVerificationRequest:
    """Test ResendVerificationRequest schema."""

    def test_valid_request(self) -> None:
        """Should accept valid email."""
        request = ResendVerificationRequest(email="user@example.com")

        assert request.email == "user@example.com"

    def test_invalid_email_rejected(self) -> None:
        """Should reject invalid email format."""
        with pytest.raises(ValidationError):
            ResendVerificationRequest(email="not-an-email")
