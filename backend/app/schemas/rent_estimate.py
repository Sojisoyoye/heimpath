"""Rent estimate request/response schemas."""

from typing import Literal

from pydantic import BaseModel


class RentRange(BaseModel):
    """Min/max rent per sqm range."""

    min: float
    max: float


class RentEstimateResponse(BaseModel):
    """Response for a rent estimate query."""

    estimated_rent_per_sqm: float | None = None
    rent_range: RentRange | None = None
    source: str | None = None
    confidence: Literal["high", "medium", "low"]
    city: str | None = None
    state_code: str | None = None
    monthly_rent: float | None = None
