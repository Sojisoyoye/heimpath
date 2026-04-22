"""Feedback request/response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreate(BaseModel):
    """Schema for creating feedback."""

    category: str = Field(
        ...,
        pattern="^(bug|feature_request|improvement|question|other)$",
        description="Feedback category",
    )
    message: str = Field(..., min_length=10, max_length=2000)
    page_url: str | None = Field(None, max_length=500)


class FeedbackResponse(BaseModel):
    """Schema for feedback response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: str
    message: str
    page_url: str | None
    created_at: datetime
