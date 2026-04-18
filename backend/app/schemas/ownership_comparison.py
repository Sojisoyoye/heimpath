"""Ownership comparison (GmbH vs. Private) request/response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class OwnershipComparisonRequest(BaseModel):
    """Request to calculate or save a GmbH vs. private ownership comparison."""

    name: str | None = Field(None, max_length=255)
    # Core inputs
    num_properties: int = Field(..., ge=1, le=50)
    annual_rental_income: float = Field(..., gt=0)
    personal_marginal_tax_rate: float = Field(..., ge=0, le=45)
    annual_appreciation: float = Field(..., ge=0, le=30)
    holding_period: int = Field(..., ge=1, le=30)
    total_property_value: float = Field(..., gt=0)
    # Advanced inputs with defaults
    building_share_percent: float = Field(default=70.0, ge=0, le=100)
    afa_rate_percent: float = Field(default=2.0, ge=0, le=10)
    annual_rent_increase_percent: float = Field(default=2.0, ge=0, le=20)
    gewerbesteuer_hebesatz: float = Field(default=400.0, ge=200, le=900)
    gmbh_setup_cost: float = Field(default=3500.0, ge=0)
    annual_accounting_cost: float = Field(default=4000.0, ge=0)


class YearProjection(BaseModel):
    """Single year projection for one ownership scenario."""

    year: int
    rental_income: float
    tax: float
    net_income_after_tax: float
    cumulative_net_income: float
    property_value: float


class ScenarioResult(BaseModel):
    """Calculated results for a single ownership scenario (private or GmbH)."""

    effective_tax_rate: float
    year1_tax: float
    year1_net_income: float
    total_net_rental_income: float
    exit_property_value: float
    capital_gains: float
    capital_gains_tax: float
    net_exit_proceeds: float
    total_wealth: float
    projections: list[YearProjection]


class OwnershipComparisonResponse(BaseModel):
    """Pure calculation result for GmbH vs. private comparison."""

    private: ScenarioResult
    gmbh: ScenarioResult
    breakeven_year: int | None
    gmbh_advantage_at_exit: float
    recommendation: str


class OwnershipComparisonSavedResponse(BaseModel):
    """Response for a saved ownership comparison with DB fields."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str | None = None
    share_id: str | None = None
    # Frozen inputs
    num_properties: int
    annual_rental_income: float
    personal_marginal_tax_rate: float
    annual_appreciation: float
    holding_period: int
    total_property_value: float
    building_share_percent: float
    afa_rate_percent: float
    annual_rent_increase_percent: float
    gewerbesteuer_hebesatz: float
    gmbh_setup_cost: float
    annual_accounting_cost: float
    # Key results
    private_total_wealth: float
    gmbh_total_wealth: float
    breakeven_year: int | None
    gmbh_advantage_at_exit: float
    recommendation: str
    # Full results as JSON
    results: dict
    created_at: datetime


class OwnershipComparisonSummary(BaseModel):
    """Summary for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str | None = None
    share_id: str | None = None
    num_properties: int
    total_property_value: float
    private_total_wealth: float
    gmbh_total_wealth: float
    recommendation: str
    created_at: datetime


class OwnershipComparisonListResponse(BaseModel):
    """List of saved ownership comparisons."""

    data: list[OwnershipComparisonSummary]
    count: int
