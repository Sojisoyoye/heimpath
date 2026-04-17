"""Professional network directory schemas for API requests and responses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.professional import ProfessionalType

# --- Professional Response ---


class ProfessionalResponse(BaseModel):
    """Professional summary for list and detail views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: ProfessionalType
    city: str
    languages: str
    description: str | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    is_verified: bool
    average_rating: float
    review_count: int
    created_at: datetime


# --- List Response ---


class ProfessionalListResponse(BaseModel):
    """Paginated list of professionals."""

    data: list[ProfessionalResponse]
    count: int
    total: int
    page: int
    page_size: int


# --- Review ---


class ReviewCreateRequest(BaseModel):
    """Request schema for submitting a review."""

    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=2000)


class ReviewResponse(BaseModel):
    """Response schema for a professional review."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    professional_id: uuid.UUID
    rating: int
    comment: str | None = None
    created_at: datetime


# --- Detail with Reviews ---


class ProfessionalDetailResponse(ProfessionalResponse):
    """Professional detail with reviews."""

    reviews: list[ReviewResponse] = []
