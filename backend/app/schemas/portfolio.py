"""Portfolio property and transaction request/response schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.portfolio import CostCategory, RecurrenceInterval, TransactionType

# ---------------------------------------------------------------------------
# Property schemas
# ---------------------------------------------------------------------------


class PortfolioPropertyCreate(BaseModel):
    """Request to create a portfolio property."""

    address: str = Field(..., max_length=500)
    city: str = Field(..., max_length=255)
    postcode: str = Field(..., max_length=10)
    state_code: str | None = Field(None, max_length=2)
    purchase_price: float = Field(..., gt=0)
    purchase_date: date | None = None
    square_meters: float = Field(..., gt=0)
    building_year: int | None = Field(None, ge=1000, le=2100)
    current_value_estimate: float | None = Field(None, gt=0)
    monthly_rent_target: float | None = Field(None, ge=0)
    tenant_name: str | None = Field(None, max_length=255)
    lease_start_date: date | None = None
    lease_end_date: date | None = None
    monthly_hausgeld: float | None = Field(None, ge=0)
    land_share: float | None = Field(None, ge=0, le=100)
    is_vacant: bool = False
    notes: str | None = None
    journey_id: uuid.UUID | None = None


class PortfolioPropertyUpdate(BaseModel):
    """Request to partially update a portfolio property."""

    address: str | None = Field(None, max_length=500)
    city: str | None = Field(None, max_length=255)
    postcode: str | None = Field(None, max_length=10)
    state_code: str | None = Field(None, max_length=2)
    purchase_price: float | None = Field(None, gt=0)
    purchase_date: date | None = None
    square_meters: float | None = Field(None, gt=0)
    building_year: int | None = Field(None, ge=1000, le=2100)
    current_value_estimate: float | None = Field(None, gt=0)
    monthly_rent_target: float | None = Field(None, ge=0)
    tenant_name: str | None = Field(None, max_length=255)
    lease_start_date: date | None = None
    lease_end_date: date | None = None
    monthly_hausgeld: float | None = Field(None, ge=0)
    land_share: float | None = Field(None, ge=0, le=100)
    is_vacant: bool | None = None
    notes: str | None = None


class PortfolioPropertyResponse(BaseModel):
    """Full response for a portfolio property."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    address: str
    city: str
    postcode: str
    state_code: str | None = None
    purchase_price: float
    purchase_date: date | None = None
    square_meters: float
    building_year: int | None = None
    current_value_estimate: float | None = None
    monthly_rent_target: float | None = None
    tenant_name: str | None = None
    lease_start_date: date | None = None
    lease_end_date: date | None = None
    monthly_hausgeld: float | None = None
    land_share: float | None = None
    is_vacant: bool
    notes: str | None = None
    journey_id: uuid.UUID | None = None
    created_at: datetime


class PortfolioPropertySummary(BaseModel):
    """Lighter property summary for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    address: str
    city: str
    postcode: str
    purchase_price: float
    monthly_rent_target: float | None = None
    is_vacant: bool
    journey_id: uuid.UUID | None = None
    created_at: datetime


class PortfolioPropertyListResponse(BaseModel):
    """Paginated list of portfolio properties."""

    data: list[PortfolioPropertySummary]
    count: int


# ---------------------------------------------------------------------------
# Transaction schemas
# ---------------------------------------------------------------------------


class PortfolioTransactionCreate(BaseModel):
    """Request to create a portfolio transaction."""

    type: TransactionType = Field(..., description="Transaction type enum value")
    amount: float = Field(..., gt=0)
    date: date
    category: str | None = Field(None, max_length=100)
    description: str | None = Field(None, max_length=500)
    is_recurring: bool = False
    cost_category: CostCategory | None = None
    estimated_amount: float | None = Field(None, ge=0)
    recurrence_interval: RecurrenceInterval | None = None


class PortfolioTransactionResponse(BaseModel):
    """Full response for a portfolio transaction."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    property_id: uuid.UUID
    type: str
    amount: float
    date: date
    category: str | None = None
    description: str | None = None
    is_recurring: bool
    cost_category: str | None = None
    estimated_amount: float | None = None
    recurrence_interval: str | None = None
    last_generated_date: date | None = None
    is_generated: bool = False
    created_at: datetime


class PortfolioTransactionListResponse(BaseModel):
    """List of portfolio transactions."""

    data: list[PortfolioTransactionResponse]
    count: int


# ---------------------------------------------------------------------------
# Summary / KPI schema
# ---------------------------------------------------------------------------


class PortfolioSummaryResponse(BaseModel):
    """Aggregated KPIs across the entire portfolio."""

    total_properties: int
    total_purchase_value: float
    total_current_value: float
    total_income: float
    total_expenses: float
    net_cash_flow: float
    vacancy_rate: float
    average_gross_yield: float


# ---------------------------------------------------------------------------
# Cost Summary schemas
# ---------------------------------------------------------------------------


class MonthlyPerformanceItem(BaseModel):
    """Single month in the portfolio performance time series."""

    month: str
    income: float
    expenses: float
    net_cash_flow: float


class PortfolioPerformanceResponse(BaseModel):
    """Monthly portfolio performance for the trailing 12 months."""

    months: list[MonthlyPerformanceItem]
    has_data: bool


class CostCategorySummary(BaseModel):
    """Summary for a single Nebenkosten category."""

    category: str
    actual_total: float
    estimated_total: float | None
    variance: float | None
    variance_percent: float | None
    is_over_threshold: bool


class CostSummaryResponse(BaseModel):
    """Aggregated running-cost summary across all Nebenkosten categories."""

    categories: list[CostCategorySummary]
    total_actual: float
    total_estimated: float | None
    total_variance: float | None
    highest_category: str | None
    alert_categories: list[str]


# ---------------------------------------------------------------------------
# Anlage V (annual rental tax summary) schemas
# ---------------------------------------------------------------------------


class AnlageVLineItem(BaseModel):
    """A single line in the Anlage V tax return."""

    model_config = ConfigDict(from_attributes=True)

    label: str
    anlage_v_zeile: str | None = None
    amount: float


class AnlageVSummaryResponse(BaseModel):
    """Annual rental income tax summary for Anlage V (§ 21 EStG)."""

    model_config = ConfigDict(from_attributes=True)

    year: int
    property_id: uuid.UUID
    # Income
    gross_rent_income: float
    other_income: float = 0.0
    # AfA
    afa_rate_percent: float
    building_value: float
    land_share_percent: float
    afa_deduction: float
    # Werbungskosten components
    mortgage_interest: float
    hausgeld: float
    insurance: float
    maintenance: float
    grundsteuer: float
    other_werbungskosten: float
    # Totals
    total_werbungskosten: float
    net_taxable_income: float
    # Line-item list for display
    line_items: list[AnlageVLineItem]
