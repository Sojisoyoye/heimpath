"""Pydantic schemas for Mietpreisbremse rent ceiling check."""

from typing import Literal

from pydantic import BaseModel, Field


class RentCeilingCheckRequest(BaseModel):
    """Input parameters for a Mietpreisbremse rent ceiling check."""

    city: Literal["berlin", "hamburg", "munich", "frankfurt"]
    postcode: str = Field(..., min_length=5, max_length=5, pattern=r"^\d{5}$")
    size_sqm: float = Field(..., gt=0, le=1000)
    building_year: int | None = Field(None, ge=1800, le=2030)
    current_rent: float = Field(..., gt=0)


class RentCeilingCheckResponse(BaseModel):
    """Result of a Mietpreisbremse rent ceiling check."""

    city: str
    postcode: str
    size_sqm: float
    current_rent: float
    reference_rent_per_sqm: float
    ceiling_rent: float
    status: Literal["OVER_LIMIT", "AT_RISK", "WITHIN_LIMIT", "ROOM_TO_INCREASE"]
    overpayment_eur: float
    maximum_legal_rent: float
    room_to_increase_eur: float
    data_source: str
    disclaimer: str
