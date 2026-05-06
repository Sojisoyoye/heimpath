"""Pydantic schemas for Mietpreisbremse rent ceiling check."""

from typing import Literal

from pydantic import BaseModel


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
