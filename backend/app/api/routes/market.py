"""Market data API endpoints.

Provides public endpoints for market data lookups such as rent estimates.
"""

import re
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.schemas.rent_estimate import RentEstimateResponse
from app.services import rent_estimate_service

router = APIRouter(prefix="/market", tags=["market"])

_POSTCODE_RE = re.compile(r"^\d{5}$")


@router.get(
    "/rent-estimate",
    responses={422: {"description": "Invalid postcode format"}},
)
async def get_rent_estimate(
    postcode: Annotated[str, Query(description="German 5-digit postcode")],
    size_sqm: Annotated[
        float | None, Query(gt=0, description="Property size in m²")
    ] = None,
    building_year: Annotated[
        int | None,
        Query(ge=1800, le=2100, description="Year the building was constructed"),
    ] = None,
) -> RentEstimateResponse:
    """Estimate rent for a German postcode using Mietspiegel data.

    No authentication required — public market data.
    """
    if not _POSTCODE_RE.match(postcode):
        raise HTTPException(
            status_code=422,
            detail="Postcode must be exactly 5 digits.",
        )

    result = rent_estimate_service.estimate_rent(
        postcode=postcode,
        size_sqm=size_sqm,
        building_year=building_year,
    )
    return RentEstimateResponse(**result)
