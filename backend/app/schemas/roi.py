"""ROI calculator request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ROICalculationCreate(BaseModel):
    """Request to create/calculate an ROI analysis."""

    name: str | None = Field(None, max_length=255)
    purchase_price: float = Field(
        ..., gt=0, description="Property purchase price in EUR"
    )
    down_payment: float = Field(..., ge=0, description="Down payment in EUR")
    monthly_rent: float = Field(..., gt=0, description="Monthly rental income in EUR")
    monthly_expenses: float = Field(
        ..., ge=0, description="Monthly operating expenses in EUR"
    )
    annual_appreciation: float = Field(
        ..., ge=0, le=100, description="Expected annual appreciation %"
    )
    vacancy_rate: float = Field(
        ..., ge=0, le=100, description="Expected vacancy rate %"
    )
    mortgage_rate: float = Field(
        ..., ge=0, le=100, description="Annual mortgage interest rate %"
    )
    mortgage_term: int = Field(..., ge=5, le=40, description="Mortgage term in years")


class ProjectionYear(BaseModel):
    """Single year projection data."""

    year: int
    property_value: float
    equity: float
    cumulative_cash_flow: float
    total_return: float
    total_return_percent: float


class ROICalculationResponse(BaseModel):
    """Full response for a saved ROI calculation."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str | None = None
    share_id: str | None = None
    # Inputs
    purchase_price: float
    down_payment: float
    monthly_rent: float
    monthly_expenses: float
    annual_appreciation: float
    vacancy_rate: float
    mortgage_rate: float
    mortgage_term: int
    # Results
    gross_rental_income: float
    net_operating_income: float
    annual_cash_flow: float
    monthly_mortgage_payment: float
    gross_yield: float
    net_yield: float
    cap_rate: float
    cash_on_cash_return: float
    investment_grade: float
    investment_grade_label: str
    # Projections
    projections: list[ProjectionYear]
    created_at: datetime


class ROICalculationSummary(BaseModel):
    """Summary for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str | None = None
    share_id: str | None = None
    purchase_price: float
    investment_grade: float
    investment_grade_label: str
    annual_cash_flow: float
    created_at: datetime


class ROICalculationListResponse(BaseModel):
    """List of saved ROI calculations."""

    data: list[ROICalculationSummary]
    count: int


class ROICompareRequest(BaseModel):
    """Request to compare multiple ROI scenarios."""

    scenarios: list[ROICalculationCreate] = Field(
        ..., min_length=2, max_length=4, description="2-4 scenarios to compare"
    )


class ROICompareResultItem(BaseModel):
    """Single scenario result in a comparison."""

    name: str | None = None
    purchase_price: float
    down_payment: float
    monthly_rent: float
    gross_rental_income: float
    net_operating_income: float
    annual_cash_flow: float
    monthly_mortgage_payment: float
    gross_yield: float
    net_yield: float
    cap_rate: float
    cash_on_cash_return: float
    investment_grade: float
    investment_grade_label: str
    projections: list[ProjectionYear]


class ROICompareResponse(BaseModel):
    """Response for ROI scenario comparison."""

    scenarios: list[ROICompareResultItem]
