"""Property evaluation calculator request/response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# /calculate endpoint schemas
# ---------------------------------------------------------------------------


class PropertyEvaluationCalculateRequest(BaseModel):
    """Flat request model for the /calculate endpoint.

    All percent-scale values (e.g. broker_fee_percent=3.57 means 3.57%).
    Every field has a default so the frontend only sends what it has.
    """

    # Property details
    address: str = ""
    square_meters: float = 0.0
    purchase_price: float = 0.0
    rent_per_m2: float = 0.0
    parking_space_rent: float = 0.0

    # Transaction cost rates (percent scale, e.g. 3.57)
    broker_fee_percent: float = 3.57
    notary_fee_percent: float = 1.5
    land_registry_fee_percent: float = 0.5
    property_transfer_tax_percent: float = 5.0

    # Monthly management costs (EUR/month)
    base_allocable_costs: float = 0.0
    property_tax_monthly: float = 0.0
    base_non_allocable_costs: float = 0.0
    reserves_monthly: float = 0.0

    # Depreciation (percent scale)
    building_share_percent: float = 70.0
    afa_rate_percent: float = 2.0

    # Financing (percent scale)
    loan_percent: float = 100.0
    interest_rate_percent: float = 4.0
    initial_repayment_rate_percent: float = 2.0

    # Tax (percent scale)
    personal_taxable_income: float = 0.0
    marginal_tax_rate_percent: float = 42.0

    # Growth assumptions (percent scale)
    cost_increase_percent: float = 2.0
    rent_increase_percent: float = 2.0
    value_increase_percent: float = 2.0
    equity_interest_percent: float = 5.0

    # Renovation
    renovation_year: int = 0
    renovation_cost: float = 0.0

    # Analysis configuration
    start_year: int = Field(default_factory=lambda: datetime.now().year)
    analysis_years: int = 11


class AnnualCashflowRowResponse(BaseModel):
    """One row of the annual cashflow table."""

    model_config = ConfigDict(from_attributes=True)

    year: int = 0
    cold_rent: float = 0.0
    management_annual: float = 0.0
    operational_cf: float = 0.0
    loan_balance_start: float = 0.0
    interest: float = 0.0
    repayment: float = 0.0
    loan_balance_end: float = 0.0
    financing_cf: float = 0.0
    net_cf_pretax: float = 0.0
    renovation_deduction: float = 0.0
    earnings_before_tax: float = 0.0
    tax_effect_marginal: float = 0.0
    net_cf_after_tax: float = 0.0
    taxable_income_adjusted: float = 0.0
    income_tax_adjusted: float = 0.0
    actual_tax_saving: float = 0.0
    property_value: float = 0.0
    equity_buildup_accumulated: float = 0.0
    equity_contribution: float = 0.0


class PropertyEvaluationCalculateResponse(BaseModel):
    """Full calculation result from the /calculate endpoint."""

    model_config = ConfigDict(from_attributes=True)

    # Property Purchase
    price_per_m2: float = 0.0
    broker_fee_amount: float = 0.0
    notary_fee_amount: float = 0.0
    land_registry_fee_amount: float = 0.0
    property_transfer_tax_amount: float = 0.0
    total_closing_costs: float = 0.0
    total_closing_costs_pct: float = 0.0
    total_investment: float = 0.0

    # Rent
    apartment_cold_rent_monthly: float = 0.0
    total_cold_rent_monthly: float = 0.0
    allocable_costs_monthly: float = 0.0
    warm_rent_monthly: float = 0.0

    # Management Costs
    non_allocable_costs_monthly: float = 0.0
    total_hausgeld_monthly: float = 0.0
    non_allocable_as_pct_of_cold_rent: float = 0.0

    # Depreciation
    afa_basis: float = 0.0
    annual_afa: float = 0.0
    monthly_afa_display: float = 0.0

    # Financing
    loan_amount: float = 0.0
    equity: float = 0.0
    annual_debt_service: float = 0.0
    monthly_debt_service: float = 0.0
    monthly_interest_yr1: float = 0.0
    monthly_repayment_yr1: float = 0.0

    # Rental Yield
    net_cold_rent_annual: float = 0.0
    gross_rental_yield: float = 0.0
    factor_cold_rent_vs_price: float = 0.0

    # Monthly Cashflow
    monthly_cashflow_pretax: float = 0.0
    monthly_taxable_property_income: float = 0.0
    monthly_tax_benefit: float = 0.0
    monthly_cashflow_after_tax: float = 0.0

    # Tax Context
    personal_taxable_income: float = 0.0
    base_income_tax: float = 0.0
    avg_tax_rate_display: float = 0.0
    personal_marginal_tax_rate: float = 0.0

    # Annual Cashflow Table
    annual_rows: list[AnnualCashflowRowResponse] = []

    # Summary KPIs
    total_operational_cf: float = 0.0
    total_financing_cf: float = 0.0
    total_net_cf_before_tax: float = 0.0
    total_net_cf_after_tax: float = 0.0
    total_equity_invested: float = 0.0
    final_equity_kpi: float = 0.0


# ---------------------------------------------------------------------------
# CRUD schemas
# ---------------------------------------------------------------------------


class PropertyEvaluationCreate(BaseModel):
    name: str | None = Field(None, max_length=255)
    journey_step_id: uuid.UUID | None = None
    inputs: dict = Field(..., description="Full PropertyEvaluationState from frontend")


class PropertyEvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str | None = None
    share_id: str | None = None
    journey_step_id: uuid.UUID | None = None
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
