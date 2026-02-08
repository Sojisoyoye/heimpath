"""Authentication request/response schemas."""
import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    """Schema for user registration.

    Password requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 number
    """

    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    citizenship: str | None = Field(default=None, max_length=50)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password meets strength requirements."""
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        return v


class RegisterResponse(BaseModel):
    """Schema for registration response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str | None = None
    citizenship: str | None = None
    email_verified: bool = False
    created_at: datetime


class LoginRequest(BaseModel):
    """Schema for login request."""

    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=1, max_length=128)
    remember_me: bool = False


class AuthToken(BaseModel):
    """JWT token response with access and refresh tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Schema for token refresh request."""

    refresh_token: str


class LogoutRequest(BaseModel):
    """Schema for logout request."""

    refresh_token: str


class VerifyEmailRequest(BaseModel):
    """Schema for email verification request."""

    token: str = Field(..., min_length=1)


class VerifyEmailResponse(BaseModel):
    """Schema for email verification response."""

    message: str
    email_verified: bool


class ResendVerificationRequest(BaseModel):
    """Schema for resending verification email."""

    email: EmailStr = Field(..., max_length=255)


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password request."""

    email: EmailStr = Field(..., max_length=255)


class ForgotPasswordResponse(BaseModel):
    """Schema for forgot password response."""

    message: str


class ResetPasswordRequest(BaseModel):
    """Schema for password reset request.

    Password requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 number
    """

    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password meets strength requirements."""
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        return v


class ResetPasswordResponse(BaseModel):
    """Schema for password reset response."""

    message: str
