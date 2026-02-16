"""User request/response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    """Shared user properties."""

    email: EmailStr = Field(..., max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    citizenship: str | None = Field(default=None, max_length=50)


class UserCreate(UserBase):
    """Schema for user creation."""

    password: str = Field(..., min_length=8, max_length=128)


class UserRegister(BaseModel):
    """Schema for user self-registration."""

    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


class UserUpdate(BaseModel):
    """Schema for user update (all fields optional)."""

    email: EmailStr | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    is_active: bool | None = None
    is_superuser: bool | None = None
    full_name: str | None = Field(default=None, max_length=255)
    citizenship: str | None = Field(default=None, max_length=50)


class UserUpdateMe(BaseModel):
    """Schema for users updating their own profile."""

    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    citizenship: str | None = Field(default=None, max_length=50)


class UpdatePassword(BaseModel):
    """Schema for password update."""

    current_password: str = Field(..., min_length=8, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class UserPublic(UserBase):
    """Schema for public user response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    email_verified: bool = False


class UsersPublic(BaseModel):
    """Schema for paginated users response."""

    data: list[UserPublic]
    count: int


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """JWT token payload."""

    sub: str | None = None


class NewPassword(BaseModel):
    """Schema for password reset."""

    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class Message(BaseModel):
    """Generic message response."""

    message: str


class ItemExport(BaseModel):
    """Schema for item data in export."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None = None
    created_at: datetime


class UserDataExport(BaseModel):
    """
    Schema for GDPR-compliant user data export.

    Contains all user data in a portable format as required by
    GDPR Article 20 (Right to Data Portability).
    """

    model_config = ConfigDict(from_attributes=True)

    # Export metadata
    export_date: datetime
    export_format_version: str = "1.0"

    # User profile data
    id: uuid.UUID
    email: str
    full_name: str | None = None
    citizenship: str | None = None
    is_active: bool
    email_verified: bool
    subscription_tier: str
    created_at: datetime
    updated_at: datetime | None = None

    # Related data
    items: list[ItemExport] = []
