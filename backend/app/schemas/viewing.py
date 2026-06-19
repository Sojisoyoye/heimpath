"""Property viewing request/response schemas."""

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PropertyViewingCreate(BaseModel):
    address: str = Field(..., min_length=1, max_length=500)
    journey_id: uuid.UUID | None = None
    viewed_at: date | None = None


class PropertyViewingUpdate(BaseModel):
    address: str | None = Field(None, min_length=1, max_length=500)
    viewed_at: date | None = None
    notes: str | None = None
    checklist_data: list[Any] | None = None


class PropertyViewingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    journey_id: uuid.UUID | None = None
    address: str
    viewed_at: date | None = None
    notes: str | None = None
    checklist_data: list[Any]
    created_at: datetime
    updated_at: datetime


class PropertyViewingListResponse(BaseModel):
    data: list[PropertyViewingResponse]
    count: int
