"""Notification request/response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    """Single notification response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: NotificationType
    title: str
    message: str
    is_read: bool
    action_url: str | None = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    """Paginated list of notifications."""

    data: list[NotificationResponse]
    count: int
    unread_count: int


class NotificationPreferenceItem(BaseModel):
    """Single notification preference."""

    notification_type: NotificationType
    is_in_app_enabled: bool = True
    is_email_enabled: bool = True


class NotificationPreferencesResponse(BaseModel):
    """Full notification preferences response."""

    preferences: list[NotificationPreferenceItem]


class NotificationPreferencesUpdate(BaseModel):
    """Request body to update notification preferences."""

    preferences: list[NotificationPreferenceItem] = Field(..., min_length=1)
