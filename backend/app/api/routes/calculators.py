"""Calculator API endpoints.

Provides endpoints for hidden cost calculations and ROI analysis,
including saving, sharing, and comparing scenarios.
"""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.schemas.calculator import (
    HiddenCostCalculationCreate,
    HiddenCostCalculationListResponse,
    HiddenCostCalculationResponse,
    HiddenCostCalculationSummary,
    StateComparisonResponse,
    StateRatesResponse,
)
from app.schemas.roi import (
    ROICalculationCreate,
    ROICalculationListResponse,
    ROICalculationResponse,
    ROICalculationSummary,
    ROICompareRequest,
    ROICompareResponse,
    ROICompareResultItem,
)
from app.services import calculator_service
from app.services import roi_service

router = APIRouter(prefix="/calculators", tags=["calculators"])


@router.get("/state-rates", response_model=StateRatesResponse)
def get_state_rates() -> StateRatesResponse:
    """
    Get all German state transfer tax rates and cost defaults.

    No authentication required.
    """
    return StateRatesResponse(
        data=calculator_service.get_state_rates(),
        cost_defaults=calculator_service.COST_DEFAULTS,
    )


@router.get("/hidden-costs/compare", response_model=StateComparisonResponse)
def compare_states(
    price: float = Query(..., gt=0, description="Property price in EUR"),
    include_agent: bool = Query(True, description="Include agent commission"),
) -> StateComparisonResponse:
    """
    Compare hidden costs across all 16 German states for a given price.

    No authentication required.
    """
    items = calculator_service.compare_states(price, include_agent)
    return StateComparisonResponse(
        property_price=price,
        include_agent=include_agent,
        data=items,
    )


@router.get("/hidden-costs/share/{share_id}", response_model=HiddenCostCalculationResponse)
def get_shared_calculation(
    share_id: str,
    session: Session = Depends(get_db),
) -> HiddenCostCalculationResponse:
    """
    Get a shared calculation by share_id.

    No authentication required.
    """
    calculation = calculator_service.get_by_share_id(session, share_id)
    return HiddenCostCalculationResponse.model_validate(calculation)


@router.post(
    "/hidden-costs",
    response_model=HiddenCostCalculationResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_calculation(
    request: HiddenCostCalculationCreate,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> HiddenCostCalculationResponse:
    """
    Calculate and save a hidden cost calculation.

    Requires authentication.
    """
    calculation = calculator_service.save_calculation(
        session=session,
        user_id=current_user.id,
        inputs=request,
    )
    return HiddenCostCalculationResponse.model_validate(calculation)


@router.get("/hidden-costs", response_model=HiddenCostCalculationListResponse)
def list_calculations(
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> HiddenCostCalculationListResponse:
    """
    Get all saved calculations for the current user.

    Requires authentication.
    """
    calculations = calculator_service.list_user_calculations(session, current_user.id)
    summaries = [
        HiddenCostCalculationSummary.model_validate(calc)
        for calc in calculations
    ]
    return HiddenCostCalculationListResponse(
        data=summaries,
        count=len(summaries),
    )


@router.get("/hidden-costs/{calc_id}", response_model=HiddenCostCalculationResponse)
def get_calculation(
    calc_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> HiddenCostCalculationResponse:
    """
    Get a specific saved calculation by ID.

    Requires authentication and ownership.
    """
    calculation = calculator_service.get_calculation(session, calc_id, current_user.id)
    return HiddenCostCalculationResponse.model_validate(calculation)


@router.delete(
    "/hidden-costs/{calc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_calculation(
    calc_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> None:
    """
    Delete a saved calculation.

    Requires authentication and ownership.
    """
    calculator_service.delete_calculation(session, calc_id, current_user.id)


# ---------------------------------------------------------------------------
# ROI Calculator endpoints
# ---------------------------------------------------------------------------


@router.post("/roi/compare", response_model=ROICompareResponse)
def compare_roi_scenarios(
    request: ROICompareRequest,
) -> ROICompareResponse:
    """
    Compare 2-4 ROI scenarios side by side.

    No authentication required. Pure calculation, no persistence.
    """
    results = roi_service.compare_scenarios(request.scenarios)
    items = [ROICompareResultItem(**r) for r in results]
    return ROICompareResponse(scenarios=items)


@router.get("/roi/share/{share_id}", response_model=ROICalculationResponse)
def get_shared_roi_calculation(
    share_id: str,
    session: Session = Depends(get_db),
) -> ROICalculationResponse:
    """
    Get a shared ROI calculation by share_id.

    No authentication required.
    """
    calculation = roi_service.get_by_share_id(session, share_id)
    return ROICalculationResponse.model_validate(calculation)


@router.post(
    "/roi",
    response_model=ROICalculationResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_roi_calculation(
    request: ROICalculationCreate,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> ROICalculationResponse:
    """
    Calculate and save an ROI analysis.

    Requires authentication.
    """
    calculation = roi_service.save_calculation(
        session=session,
        user_id=current_user.id,
        inputs=request,
    )
    return ROICalculationResponse.model_validate(calculation)


@router.get("/roi", response_model=ROICalculationListResponse)
def list_roi_calculations(
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> ROICalculationListResponse:
    """
    Get all saved ROI calculations for the current user.

    Requires authentication.
    """
    calculations = roi_service.list_user_calculations(session, current_user.id)
    summaries = [
        ROICalculationSummary.model_validate(calc)
        for calc in calculations
    ]
    return ROICalculationListResponse(
        data=summaries,
        count=len(summaries),
    )


@router.get("/roi/{calc_id}", response_model=ROICalculationResponse)
def get_roi_calculation(
    calc_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> ROICalculationResponse:
    """
    Get a specific saved ROI calculation by ID.

    Requires authentication and ownership.
    """
    calculation = roi_service.get_calculation(session, calc_id, current_user.id)
    return ROICalculationResponse.model_validate(calculation)


@router.delete(
    "/roi/{calc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_roi_calculation(
    calc_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> None:
    """
    Delete a saved ROI calculation.

    Requires authentication and ownership.
    """
    roi_service.delete_calculation(session, calc_id, current_user.id)
