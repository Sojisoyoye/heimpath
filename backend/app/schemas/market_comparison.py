"""Schemas for city/area comparison endpoints."""

from typing import Literal

from pydantic import BaseModel

AreaType = Literal["city", "state"]
MarketTrend = Literal["rising", "stable", "falling"]


class AreaSummary(BaseModel):
    """Summary of a comparable area (city or state)."""

    key: str
    name: str
    area_type: AreaType
    state_code: str
    state_name: str


class ComparisonMetrics(BaseModel):
    """Full comparison metrics for a single area."""

    key: str
    name: str
    area_type: AreaType
    state_code: str
    state_name: str
    avg_price_per_sqm: int
    price_range_min: int
    price_range_max: int
    avg_rent_per_sqm: float | None = None
    rent_range_min: float | None = None
    rent_range_max: float | None = None
    gross_rental_yield: float | None = None
    transfer_tax_rate: float
    agent_fee_percent: float | None = None
    trend: MarketTrend | None = None
    has_mietspiegel: bool


class AreaListResponse(BaseModel):
    """Response for the area listing endpoint."""

    areas: list[AreaSummary]


class ComparisonResponse(BaseModel):
    """Response for the area comparison endpoint."""

    areas: list[ComparisonMetrics]
