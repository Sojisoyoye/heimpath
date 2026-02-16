"""Hidden cost calculator request/response schemas."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StateRate(BaseModel):
    """Transfer tax rate for a German state."""

    state_code: str
    state_name: str
    transfer_tax_rate: float


class CostDefaults(BaseModel):
    """Default cost percentages used in calculations."""

    notary_fee_percent: float
    land_registry_fee_percent: float
    agent_commission_percent: float


class StateRatesResponse(BaseModel):
    """Response containing all state rates and cost defaults."""

    data: list[StateRate]
    cost_defaults: CostDefaults


class HiddenCostCalculationCreate(BaseModel):
    """Request to save a hidden cost calculation."""

    name: str | None = Field(None, max_length=255)
    property_price: float = Field(..., gt=0, description="Property price in EUR")
    state_code: str = Field(..., min_length=2, max_length=2, description="German state code")
    property_type: str = Field(..., max_length=50)
    include_agent: bool = True
    renovation_level: Literal["none", "light", "medium", "full"] = "none"
    include_moving: bool = True


class HiddenCostCalculationResponse(BaseModel):
    """Full response for a saved calculation."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str | None = None
    share_id: str | None = None
    # Inputs
    property_price: float
    state_code: str
    property_type: str
    include_agent: bool
    renovation_level: str
    include_moving: bool
    # Results
    transfer_tax: float
    notary_fee: float
    land_registry_fee: float
    agent_commission: float
    renovation_estimate: float
    moving_costs: float
    total_additional_costs: float
    total_cost_of_ownership: float
    additional_cost_percentage: float
    created_at: datetime


class HiddenCostCalculationSummary(BaseModel):
    """Summary for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str | None = None
    share_id: str | None = None
    property_price: float
    state_code: str
    total_additional_costs: float
    total_cost_of_ownership: float
    created_at: datetime


class HiddenCostCalculationListResponse(BaseModel):
    """Paginated list of saved calculations."""

    data: list[HiddenCostCalculationSummary]
    count: int


class StateComparisonItem(BaseModel):
    """Cost breakdown for a single state in comparison view."""

    state_code: str
    state_name: str
    transfer_tax_rate: float
    transfer_tax: float
    notary_fee: float
    land_registry_fee: float
    agent_commission: float
    total_cost: float


class StateComparisonResponse(BaseModel):
    """Response for state-by-state comparison."""

    property_price: float
    include_agent: bool
    data: list[StateComparisonItem]
