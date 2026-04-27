import uuid
from datetime import datetime, timezone
from enum import Enum

from pydantic import EmailStr
from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


class SubscriptionTier(str, Enum):
    """User subscription tier levels."""

    FREE = "free"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    citizenship: str | None = Field(default=None, max_length=50)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    email_verified: bool = True


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    citizenship: str | None = Field(default=None, max_length=50)
    onboarding_completed: bool | None = None
    onboarding_persona: str | None = Field(default=None, max_length=50)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    email_verified: bool = Field(default=False)
    onboarding_completed: bool = Field(default=False)
    onboarding_persona: str | None = Field(default=None, max_length=50)
    subscription_tier: SubscriptionTier = Field(
        default=SubscriptionTier.FREE,
        sa_column=Column(
            SAEnum(SubscriptionTier, values_callable=lambda x: [e.value for e in x]),
            nullable=False,
        ),
    )
    avatar_url: str | None = Field(default=None)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
        sa_column_kwargs={"onupdate": get_datetime_utc},
    )


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    email_verified: bool = False
    onboarding_completed: bool = False
    onboarding_persona: str | None = None
    avatar_url: str | None = None
    subscription_tier: SubscriptionTier = SubscriptionTier.FREE
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
