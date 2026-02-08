"""Journey request/response schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.journey import (
    FinancingType,
    JourneyPhase,
    PropertyType,
    StepStatus,
)


# Questionnaire schemas


class QuestionnaireAnswers(BaseModel):
    """Answers from the onboarding questionnaire."""

    property_type: PropertyType
    property_location: str = Field(..., max_length=255)
    financing_type: FinancingType
    is_first_time_buyer: bool = True
    has_german_residency: bool = False
    budget_euros: int | None = Field(default=None, ge=0)
    target_purchase_date: datetime | None = None


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
    related_laws: str | None = None  # JSON string
    estimated_costs: str | None = None  # JSON string
    prerequisites: str | None = None  # JSON string


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
    related_laws: str | None = None
    estimated_costs: str | None = None
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
    started_at: datetime | None = None
    completed_at: datetime | None = None
    is_active: bool
    created_at: datetime
    steps: list[JourneyStepSummary] = []


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
