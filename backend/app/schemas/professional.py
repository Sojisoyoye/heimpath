"""Professional network directory schemas for API requests and responses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.professional import ProfessionalType, ServiceType

# --- Admin Requests ---


class ProfessionalCreateRequest(BaseModel):
    """Request schema for creating a professional (admin only)."""

    name: str = Field(..., max_length=255)
    type: ProfessionalType
    city: str = Field(..., max_length=255)
    languages: str = Field(..., max_length=500)
    description: str | None = None
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)
    website: str | None = Field(None, max_length=500)
    is_verified: bool = False


class ProfessionalUpdateRequest(BaseModel):
    """Request schema for updating a professional (admin only). All fields optional."""

    name: str | None = Field(None, max_length=255)
    type: ProfessionalType | None = None
    city: str | None = Field(None, max_length=255)
    languages: str | None = Field(None, max_length=500)
    description: str | None = None
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)
    website: str | None = Field(None, max_length=500)
    is_verified: bool | None = None


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
    recommendation_rate: float | None = None
    review_highlights: dict | None = None
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
    service_used: ServiceType | None = None
    language_used: str | None = Field(None, max_length=100)
    would_recommend: bool | None = None
    response_time_rating: int | None = Field(None, ge=1, le=5)


class ReviewResponse(BaseModel):
    """Response schema for a professional review."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    professional_id: uuid.UUID
    rating: int
    comment: str | None = None
    service_used: ServiceType | None = None
    language_used: str | None = None
    would_recommend: bool | None = None
    response_time_rating: int | None = None
    created_at: datetime


# --- Detail with Reviews ---


class ProfessionalDetailResponse(ProfessionalResponse):
    """Professional detail with reviews."""

    reviews: list[ReviewResponse] = []
