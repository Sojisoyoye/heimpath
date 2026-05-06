"""Market data API endpoints.

Provides public endpoints for market data lookups such as rent estimates
and city/state comparison.
"""

import re
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.schemas.market_comparison import (
    AreaListResponse,
    ComparisonResponse,
)
from app.schemas.rent_estimate import RentEstimateResponse
from app.services import market_comparison_service, rent_estimate_service

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


@router.get("/areas")
async def list_areas() -> AreaListResponse:
    """List all available areas for comparison.

    No authentication required — public market data.
    """
    areas = market_comparison_service.list_areas()
    return AreaListResponse(areas=areas)


@router.get(
    "/compare",
    responses={400: {"description": "Invalid number of keys"}},
)
async def compare_areas(
    keys: Annotated[
        list[str],
        Query(description="Area keys to compare (2–4)"),
    ],
) -> ComparisonResponse:
    """Compare 2–4 areas side by side.

    No authentication required — public market data.
    """
    if len(keys) < 2 or len(keys) > 4:
        raise HTTPException(
            status_code=400,
            detail="Provide between 2 and 4 area keys.",
        )
    areas = market_comparison_service.compare_areas(keys)
    return ComparisonResponse(areas=areas)
