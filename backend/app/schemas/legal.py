"""Legal Knowledge Base schemas for API requests and responses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.legal import LawCategory, PropertyTypeApplicability

# --- Court Ruling Schemas ---


class CourtRulingBase(BaseModel):
    """Base schema for court rulings."""

    court_name: str
    case_number: str
    ruling_date: datetime
    title: str
    summary: str
    significance: str | None = None
    source_url: str | None = None


class CourtRulingResponse(CourtRulingBase):
    """Response schema for court rulings."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


# --- State Variation Schemas ---


class StateVariationBase(BaseModel):
    """Base schema for state variations."""

    state_code: str = Field(..., max_length=2)
    state_name: str
    variation_title: str
    variation_value: str | None = None
    variation_description: str
    effective_date: datetime | None = None


class StateVariationResponse(StateVariationBase):
    """Response schema for state variations."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


# --- Law Schemas ---


class LawSummary(BaseModel):
    """Summary view of a law for list responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    citation: str
    title_en: str
    category: LawCategory
    property_type: PropertyTypeApplicability
    one_line_summary: str


class LawResponse(BaseModel):
    """Full response schema for a law."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    citation: str
    title_de: str
    title_en: str
    category: LawCategory
    property_type: PropertyTypeApplicability
    one_line_summary: str
    short_summary: str
    detailed_explanation: str
    real_world_example: str | None = None
    common_disputes: str | None = None
    buyer_implications: str | None = None
    seller_implications: str | None = None
    landlord_implications: str | None = None
    tenant_implications: str | None = None
    original_text_de: str | None = None
    last_amended: datetime | None = None
    change_history: str | None = None
    created_at: datetime
    updated_at: datetime

    # Related data
    court_rulings: list[CourtRulingResponse] = []
    state_variations: list[StateVariationResponse] = []


class LawDetailResponse(LawResponse):
    """Extended response with related laws."""

    related_laws: list[LawSummary] = []
    is_bookmarked: bool = False


class LawListResponse(BaseModel):
    """Paginated list of laws."""

    data: list[LawSummary]
    count: int
    total: int
    page: int
    page_size: int


class LawSearchResult(BaseModel):
    """Search result with relevance score."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    citation: str
    title_en: str
    category: LawCategory
    one_line_summary: str
    relevance_score: float = Field(..., ge=0, le=1)
    matched_fields: list[str] = []


class LawSearchResponse(BaseModel):
    """Search results response."""

    data: list[LawSearchResult]
    count: int
    query: str


# --- Bookmark Schemas ---


class BookmarkCreate(BaseModel):
    """Request schema for creating a bookmark."""

    notes: str | None = None


class BookmarkResponse(BaseModel):
    """Response schema for a bookmark."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    law_id: uuid.UUID
    notes: str | None = None
    created_at: datetime
    law: LawSummary


class BookmarkListResponse(BaseModel):
    """List of user bookmarks."""

    data: list[BookmarkResponse]
    count: int


# --- Law Create/Update Schemas (for admin) ---


class LawCreate(BaseModel):
    """Request schema for creating a law."""

    citation: str = Field(..., max_length=100)
    title_de: str = Field(..., max_length=500)
    title_en: str = Field(..., max_length=500)
    category: LawCategory
    property_type: PropertyTypeApplicability = PropertyTypeApplicability.ALL
    one_line_summary: str = Field(..., max_length=280)
    short_summary: str
    detailed_explanation: str
    real_world_example: str | None = None
    common_disputes: str | None = None
    buyer_implications: str | None = None
    seller_implications: str | None = None
    landlord_implications: str | None = None
    tenant_implications: str | None = None
    original_text_de: str | None = None
    last_amended: datetime | None = None


class LawUpdate(BaseModel):
    """Request schema for updating a law."""

    title_de: str | None = None
    title_en: str | None = None
    category: LawCategory | None = None
    property_type: PropertyTypeApplicability | None = None
    one_line_summary: str | None = None
    short_summary: str | None = None
    detailed_explanation: str | None = None
    real_world_example: str | None = None
    common_disputes: str | None = None
    buyer_implications: str | None = None
    seller_implications: str | None = None
    landlord_implications: str | None = None
    tenant_implications: str | None = None
    original_text_de: str | None = None
    last_amended: datetime | None = None


# --- Filter Schemas ---


class LawFilter(BaseModel):
    """Filter parameters for law queries."""

    category: LawCategory | None = None
    property_type: PropertyTypeApplicability | None = None
    state: str | None = Field(None, max_length=2, description="German state code")
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


# --- Journey Step Law Link ---


class JourneyStepLawResponse(BaseModel):
    """Response for laws linked to a journey step."""

    model_config = ConfigDict(from_attributes=True)

    law: LawSummary
    relevance_score: int = Field(..., ge=0, le=100)


class JourneyStepLawsResponse(BaseModel):
    """List of laws for a journey step."""

    data: list[JourneyStepLawResponse]
    count: int
    step_content_key: str
