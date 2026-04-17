"""Journey request/response schemas."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.journey import (
    FinancingType,
    JourneyPhase,
    PropertyType,
    StepStatus,
)

# Market Insights schema (generated after Step 1 completion)


class MarketInsightsData(BaseModel):
    """Computed market insights stored on the journey after Step 1 completion."""

    state_code: str
    state_name: str
    avg_price_per_sqm: float
    price_range_min: float
    price_range_max: float
    agent_fee_percent: float
    trend: Literal["rising", "stable", "falling"]
    hotspots: list[str]
    transfer_tax_rate: float
    property_type: str
    type_multiplier: float
    adjusted_avg_price_per_sqm: float
    adjusted_min_price_per_sqm: float
    adjusted_max_price_per_sqm: float
    estimated_size_sqm: int | None = None
    preferred_area: str | None = None
    generated_at: str


# Property Goals schemas (Step 1)


class PropertyGoals(BaseModel):
    """Property goals and preferences from Step 1."""

    # Property type preference (can differ from initial questionnaire)
    preferred_property_type: str | None = None

    # Budget range (pre-filled from wizard questionnaire)
    budget_min_euros: int | None = Field(default=None, ge=0)
    budget_max_euros: int | None = Field(default=None, ge=0)

    # Room requirements
    min_rooms: int | None = Field(default=None, ge=1, le=10)
    min_bathrooms: int | None = Field(default=None, ge=1, le=5)

    # Floor preferences
    preferred_floor: str | None = None  # "ground", "middle", "top", "any"
    has_elevator_required: bool = False

    # Must-have features (checkboxes)
    features: list[str] = Field(default_factory=list)
    # e.g., ["balcony", "garden", "parking", "storage", "modern_kitchen", "energy_efficient"]

    # Size preferences
    min_size_sqm: int | None = Field(default=None, ge=10)
    max_size_sqm: int | None = Field(default=None, ge=10)

    # Additional notes (optional text input)
    additional_notes: str | None = Field(default=None, max_length=1000)

    # Property use intent
    property_use: Literal["live_in", "rent_out"] | None = None

    # Preferred area / neighborhood within the selected state
    preferred_area: str | None = Field(default=None, max_length=100)

    # Completion status
    is_completed: bool = False


class PropertyGoalsUpdate(BaseModel):
    """Schema for updating property goals."""

    preferred_property_type: str | None = None
    budget_min_euros: int | None = Field(default=None, ge=0)
    budget_max_euros: int | None = Field(default=None, ge=0)
    min_rooms: int | None = Field(default=None, ge=1, le=10)
    min_bathrooms: int | None = Field(default=None, ge=1, le=5)
    preferred_floor: str | None = None
    has_elevator_required: bool | None = None
    features: list[str] | None = None
    min_size_sqm: int | None = Field(default=None, ge=10)
    max_size_sqm: int | None = Field(default=None, ge=10)
    additional_notes: str | None = Field(default=None, max_length=1000)
    property_use: Literal["live_in", "rent_out"] | None = None
    preferred_area: str | None = Field(default=None, max_length=100)
    is_completed: bool | None = None


# Questionnaire schemas


class QuestionnaireAnswers(BaseModel):
    """Answers from the onboarding questionnaire."""

    property_type: PropertyType
    property_location: str = Field(..., max_length=255)
    financing_type: FinancingType
    is_first_time_buyer: bool = True
    has_german_residency: bool = False
    budget_euros: int | None = Field(default=None, ge=0)  # max budget
    budget_min_euros: int | None = Field(default=None, ge=0)  # min budget
    target_purchase_date: datetime | None = None
    property_use: Literal["live_in", "rent_out"] | None = None


# Task schemas


class JourneyTaskBase(BaseModel):
    """Base schema for journey tasks."""

    title: str = Field(..., max_length=255)
    description: str | None = None
    is_required: bool = True
    resource_url: str | None = Field(default=None, max_length=500)
    resource_type: str | None = Field(default=None, max_length=50)


class JourneyTaskCreate(JourneyTaskBase):
    """Schema for creating a journey task."""

    order: int = 0


class JourneyTaskUpdate(BaseModel):
    """Schema for updating a journey task."""

    is_completed: bool


class JourneyTaskResponse(JourneyTaskBase):
    """Schema for journey task response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order: int
    is_completed: bool
    completed_at: datetime | None = None


# Step schemas


class JourneyStepBase(BaseModel):
    """Base schema for journey steps."""

    step_number: int
    phase: JourneyPhase
    title: str = Field(..., max_length=255)
    description: str | None = None
    estimated_duration_days: int | None = None


class JourneyStepCreate(JourneyStepBase):
    """Schema for creating a journey step."""

    content_key: str | None = None
    related_laws: list[str] | None = None
    estimated_costs: dict[str, Any] | None = None
    prerequisites: list[int] | None = None


class JourneyStepUpdate(BaseModel):
    """Schema for updating a journey step status."""

    status: StepStatus


class JourneyStepResponse(JourneyStepBase):
    """Schema for journey step response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: StepStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    content_key: str | None = None
    related_laws: list[str] | None = None
    estimated_costs: dict[str, Any] | None = None
    tasks: list[JourneyTaskResponse] = []


class JourneyStepSummary(BaseModel):
    """Summary schema for journey step (without tasks)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    step_number: int
    phase: JourneyPhase
    title: str
    status: StepStatus
    estimated_duration_days: int | None = None


# Journey schemas


class JourneyCreate(BaseModel):
    """Schema for creating a journey from questionnaire."""

    title: str = Field(default="My Property Journey", max_length=255)
    questionnaire: QuestionnaireAnswers


class JourneyUpdate(BaseModel):
    """Schema for updating journey metadata."""

    title: str | None = Field(default=None, max_length=255)
    target_purchase_date: datetime | None = None
    is_active: bool | None = None


class JourneyResponse(BaseModel):
    """Schema for journey response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    current_phase: JourneyPhase
    current_step_number: int
    property_type: PropertyType | None = None
    property_location: str | None = None
    financing_type: FinancingType | None = None
    is_first_time_buyer: bool
    has_german_residency: bool
    budget_euros: int | None = None
    target_purchase_date: datetime | None = None
    property_use: str | None = None
    property_goals: PropertyGoals | None = None
    market_insights: MarketInsightsData | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    is_active: bool
    created_at: datetime
    steps: list[JourneyStepSummary] = []
    progress_percentage: float = 0
    completed_steps: int = 0
    total_steps: int = 0


class JourneyDetailResponse(JourneyResponse):
    """Detailed journey response with full step data."""

    steps: list[JourneyStepResponse] = []


class JourneyProgressResponse(BaseModel):
    """Schema for journey progress."""

    journey_id: uuid.UUID
    total_steps: int
    completed_steps: int
    current_step_number: int
    current_phase: JourneyPhase
    progress_percentage: float
    estimated_days_remaining: int | None = None
    phases: dict[str, dict[str, int]]  # Phase -> {total, completed}


class NextStepResponse(BaseModel):
    """Schema for next recommended step."""

    has_next: bool
    step: JourneyStepResponse | None = None
    message: str | None = None


class JourneysListResponse(BaseModel):
    """Schema for list of journeys."""

    data: list[JourneyResponse]
    count: int
