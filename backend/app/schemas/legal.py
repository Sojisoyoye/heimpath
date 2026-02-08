"""Legal Knowledge Base schemas for API requests and responses."""
import uuid
from datetime import datetime
from typing import Optional

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
    significance: Optional[str] = None
    source_url: Optional[str] = None


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
    variation_value: Optional[str] = None
    variation_description: str
    effective_date: Optional[datetime] = None


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
    real_world_example: Optional[str] = None
    common_disputes: Optional[str] = None
    buyer_implications: Optional[str] = None
    seller_implications: Optional[str] = None
    landlord_implications: Optional[str] = None
    tenant_implications: Optional[str] = None
    original_text_de: Optional[str] = None
    last_amended: Optional[datetime] = None
    change_history: Optional[str] = None
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

    notes: Optional[str] = None


class BookmarkResponse(BaseModel):
    """Response schema for a bookmark."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    law_id: uuid.UUID
    notes: Optional[str] = None
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
    real_world_example: Optional[str] = None
    common_disputes: Optional[str] = None
    buyer_implications: Optional[str] = None
    seller_implications: Optional[str] = None
    landlord_implications: Optional[str] = None
    tenant_implications: Optional[str] = None
    original_text_de: Optional[str] = None
    last_amended: Optional[datetime] = None


class LawUpdate(BaseModel):
    """Request schema for updating a law."""

    title_de: Optional[str] = None
    title_en: Optional[str] = None
    category: Optional[LawCategory] = None
    property_type: Optional[PropertyTypeApplicability] = None
    one_line_summary: Optional[str] = None
    short_summary: Optional[str] = None
    detailed_explanation: Optional[str] = None
    real_world_example: Optional[str] = None
    common_disputes: Optional[str] = None
    buyer_implications: Optional[str] = None
    seller_implications: Optional[str] = None
    landlord_implications: Optional[str] = None
    tenant_implications: Optional[str] = None
    original_text_de: Optional[str] = None
    last_amended: Optional[datetime] = None


# --- Filter Schemas ---

class LawFilter(BaseModel):
    """Filter parameters for law queries."""

    category: Optional[LawCategory] = None
    property_type: Optional[PropertyTypeApplicability] = None
    state: Optional[str] = Field(None, max_length=2, description="German state code")
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
