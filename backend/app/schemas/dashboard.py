"""Dashboard schemas for aggregated user overview."""

import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class ActivityType(str, Enum):
    """Types of user activity tracked on the dashboard."""

    JOURNEY_STARTED = "journey_started"
    STEP_COMPLETED = "step_completed"
    DOCUMENT_UPLOADED = "document_uploaded"
    CALCULATION_SAVED = "calculation_saved"
    ROI_CALCULATED = "roi_calculated"
    FINANCING_ASSESSED = "financing_assessed"
    LAW_BOOKMARKED = "law_bookmarked"


class JourneyOverview(BaseModel):
    """Summary of user's active journey for dashboard display."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    current_phase: str
    current_step_number: int
    progress_percentage: float
    completed_steps: int
    total_steps: int
    estimated_days_remaining: int | None = None
    started_at: datetime | None = None
    next_step_title: str | None = None
    next_step_id: uuid.UUID | None = None
    phases: dict[str, dict[str, int]]


class SavedDocumentSummary(BaseModel):
    """Brief document info for dashboard lists."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str
    document_type: str
    status: str
    created_at: datetime


class SavedCalculationSummary(BaseModel):
    """Brief calculation info for dashboard lists."""

    id: uuid.UUID
    name: str | None = None
    calculator_type: str  # "hidden_costs" | "roi" | "financing"
    headline_value: str  # e.g. "€245,000"
    created_at: datetime


class BookmarkedLawSummary(BaseModel):
    """Brief bookmarked law info for dashboard lists."""

    id: uuid.UUID
    citation: str
    title_en: str
    category: str
    bookmarked_at: datetime


class ActivityItem(BaseModel):
    """Single activity entry for the timeline."""

    activity_type: ActivityType
    title: str
    description: str
    entity_id: uuid.UUID
    timestamp: datetime


class DashboardOverviewResponse(BaseModel):
    """Aggregated dashboard data for the authenticated user."""

    journey: JourneyOverview | None = None
    has_journey: bool
    recent_documents: list[SavedDocumentSummary]
    recent_calculations: list[SavedCalculationSummary]
    bookmarked_laws: list[BookmarkedLawSummary]
    recent_activity: list[ActivityItem]
    documents_translated_this_month: int
    total_calculations: int
    total_bookmarks: int
