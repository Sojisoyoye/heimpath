"""Property evaluation calculator request/response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PropertyEvaluationCreate(BaseModel):
    name: str | None = Field(None, max_length=255)
    journey_step_id: uuid.UUID | None = None
    inputs: dict = Field(..., description="Full PropertyEvaluationState from frontend")


class PropertyEvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str | None = None
    share_id: str | None = None
    journey_step_id: str | None = None
    purchase_price: float
    square_meters: float
    state_code: str | None = None
    cashflow_after_tax: float
    gross_rental_yield: float
    return_on_equity: float
    is_positive_cashflow: bool
    inputs: dict
    results: dict
    created_at: datetime


class PropertyEvaluationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str | None = None
    share_id: str | None = None
    purchase_price: float
    cashflow_after_tax: float
    gross_rental_yield: float
    is_positive_cashflow: bool
    created_at: datetime


class PropertyEvaluationListResponse(BaseModel):
    data: list[PropertyEvaluationSummary]
    count: int
