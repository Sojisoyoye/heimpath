"""Property evaluation calculator request/response schemas."""

import dataclasses
import typing
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, create_model

from app.services.property_evaluation_calculator import (
    AnnualCashflowRow,
    EvaluationResult,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _pydantic_from_dataclass(
    dc_cls: type,
    model_name: str,
    *,
    exclude_fields: set[str] | None = None,
    overrides: dict[str, tuple] | None = None,
) -> type[BaseModel]:
    """Create a Pydantic model mirroring a dataclass's field definitions.

    Uses ``typing.get_type_hints()`` to resolve forward-ref annotations
    (from ``__future__ import annotations`` in the calculator module).
    """
    exclude = exclude_fields or set()
    hints = typing.get_type_hints(dc_cls)
    field_defs: dict[str, tuple] = {}

    for f in dataclasses.fields(dc_cls):
        if f.name in exclude:
            continue
        default = (
            f.default
            if f.default is not dataclasses.MISSING
            else (
                f.default_factory()
                if f.default_factory is not dataclasses.MISSING
                else ...
            )
        )
        field_defs[f.name] = (hints[f.name], default)

    if overrides:
        field_defs.update(overrides)

    return create_model(
        model_name,
        __config__=ConfigDict(from_attributes=True),
        **field_defs,
    )


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


AnnualCashflowRowResponse = _pydantic_from_dataclass(
    AnnualCashflowRow,
    "AnnualCashflowRowResponse",
)

PropertyEvaluationCalculateResponse = _pydantic_from_dataclass(
    EvaluationResult,
    "PropertyEvaluationCalculateResponse",
    exclude_fields={"annual_rows"},
    overrides={"annual_rows": (list[AnnualCashflowRowResponse], [])},
)


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
