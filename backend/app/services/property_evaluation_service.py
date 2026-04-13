"""Property evaluation calculator service.

Handles evaluation calculations, CRUD operations for saved evaluations,
and auto-completion of journey tasks.
"""

import dataclasses
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.journey import JourneyTask
from app.models.property_evaluation import PropertyEvaluation
from app.schemas.property_evaluation import (
    PropertyEvaluationCalculateRequest,
    PropertyEvaluationCreate,
)
from app.services.property_evaluation_calculator import (
    EvaluationInputs,
    EvaluationResult,
    calculate,
)

# ---------------------------------------------------------------------------
# Calculation
# ---------------------------------------------------------------------------


def _inputs_from_dict(inputs: dict) -> EvaluationInputs:
    """Convert nested frontend dict to flat EvaluationInputs.

    Handles the nested format with property_info, rent, operating_costs,
    financing sub-dicts and percent-scale values -> decimal-scale rates.
    """
    property_info = inputs.get("property_info", {})
    rent = inputs.get("rent", {})
    operating_costs = inputs.get("operating_costs", {})
    financing = inputs.get("financing", {})

    return EvaluationInputs(
        address=property_info.get("address", ""),
        square_meters=property_info.get("square_meters", 0),
        purchase_price=property_info.get("purchase_price", 0),
        rent_per_m2=rent.get("rent_per_sqm", 0),
        parking_space_rent=rent.get("parking_rent", 0),
        broker_fee_rate=property_info.get("broker_fee_percent", 0) / 100,
        notary_fee_rate=property_info.get("notary_fee_percent", 0) / 100,
        land_registry_fee_rate=property_info.get("land_registry_fee_percent", 0) / 100,
        property_transfer_tax_rate=property_info.get("transfer_tax_percent", 0) / 100,
        base_allocable_costs=operating_costs.get("hausgeld_allocable", 0),
        property_tax_monthly=operating_costs.get("property_tax_monthly", 0),
        base_non_allocable_costs=operating_costs.get("hausgeld_non_allocable", 0),
        reserves_monthly=operating_costs.get("reserves_portion", 0),
        building_share_pct=rent.get("building_share_percent", 70) / 100,
        afa_rate=rent.get("depreciation_rate_percent", 2) / 100,
        loan_pct_of_purchase=financing.get("loan_percent", 100) / 100,
        interest_rate=financing.get("interest_rate_percent", 4) / 100,
        initial_repayment_rate=financing.get("repayment_rate_percent", 2) / 100,
        personal_taxable_income=rent.get("personal_taxable_income", 0),
        personal_marginal_tax_rate=rent.get("marginal_tax_rate_percent", 42) / 100,
        cost_increase_pa=rent.get("cost_increase_percent", 2) / 100,
        rent_increase_pa=rent.get("rent_increase_percent", 2) / 100,
        value_increase_pa=rent.get("value_increase_percent", 1.5) / 100,
        interest_on_equity_pa=rent.get("equity_interest_percent", 5) / 100,
        renovation_year=rent.get("renovation_year", 0),
        renovation_cost=rent.get("renovation_cost", 0),
        start_year=rent.get("start_year", 2025),
        analysis_years=rent.get("analysis_years", 11),
    )


def _result_to_dict(result: EvaluationResult) -> dict:
    """Convert EvaluationResult dataclass to a plain dict."""
    return dataclasses.asdict(result)


def calculate_results(inputs: dict) -> dict:
    """Compute property evaluation results from a nested frontend dict.

    Args:
        inputs: PropertyEvaluationState dict with propertyInfo, rent,
                operatingCosts, financing sub-objects.

    Returns:
        EvaluationResult as a dict.

    Raises:
        HTTPException: If required inputs are missing or invalid.
    """
    property_info = inputs.get("property_info", {})
    purchase_price = property_info.get("purchase_price", 0)
    square_meters = property_info.get("square_meters", 0)

    if purchase_price <= 0 or square_meters <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="purchase_price and square_meters must be positive",
        )

    eval_inputs = _inputs_from_dict(inputs)
    result = calculate(eval_inputs)
    return _result_to_dict(result)


def calculate_from_request(
    request: PropertyEvaluationCalculateRequest,
) -> EvaluationResult:
    """Typed calculation path for the /calculate endpoint.

    Converts percent-scale request fields to decimal-scale rates,
    runs the full calculation, and returns the typed result.
    """
    eval_inputs = EvaluationInputs(
        address=request.address,
        square_meters=request.square_meters,
        purchase_price=request.purchase_price,
        rent_per_m2=request.rent_per_m2,
        parking_space_rent=request.parking_space_rent,
        broker_fee_rate=request.broker_fee_percent / 100,
        notary_fee_rate=request.notary_fee_percent / 100,
        land_registry_fee_rate=request.land_registry_fee_percent / 100,
        property_transfer_tax_rate=request.property_transfer_tax_percent / 100,
        base_allocable_costs=request.base_allocable_costs,
        property_tax_monthly=request.property_tax_monthly,
        base_non_allocable_costs=request.base_non_allocable_costs,
        reserves_monthly=request.reserves_monthly,
        building_share_pct=request.building_share_percent / 100,
        afa_rate=request.afa_rate_percent / 100,
        loan_pct_of_purchase=request.loan_percent / 100,
        interest_rate=request.interest_rate_percent / 100,
        initial_repayment_rate=request.initial_repayment_rate_percent / 100,
        personal_taxable_income=request.personal_taxable_income,
        personal_marginal_tax_rate=request.marginal_tax_rate_percent / 100,
        cost_increase_pa=request.cost_increase_percent / 100,
        rent_increase_pa=request.rent_increase_percent / 100,
        value_increase_pa=request.value_increase_percent / 100,
        interest_on_equity_pa=request.equity_interest_percent / 100,
        renovation_year=request.renovation_year,
        renovation_cost=request.renovation_cost,
        start_year=request.start_year,
        analysis_years=request.analysis_years,
    )
    return calculate(eval_inputs)


# ---------------------------------------------------------------------------
# Auto-complete journey task
# ---------------------------------------------------------------------------


def _auto_complete_evaluation_task(
    session: Session,
    journey_step_id: uuid.UUID,
) -> None:
    """Find and mark the 'Run evaluation calculator' task as completed."""
    statement = select(JourneyTask).where(
        JourneyTask.step_id == journey_step_id,
        JourneyTask.title == "Run evaluation calculator",
        JourneyTask.is_completed == False,  # noqa: E712
    )
    task = session.exec(statement).first()
    if task:
        task.is_completed = True
        task.completed_at = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# CRUD operations
# ---------------------------------------------------------------------------


def save_evaluation(
    session: Session,
    user_id: uuid.UUID,
    data: PropertyEvaluationCreate,
) -> PropertyEvaluation:
    """Compute results, persist evaluation, and auto-complete journey task.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.
        data: Validated creation inputs.

    Returns:
        Persisted PropertyEvaluation model.
    """
    results = calculate_results(data.inputs)

    property_info = data.inputs.get("property_info", {})
    purchase_price = property_info.get("purchase_price", 0)
    square_meters = property_info.get("square_meters", 0)
    state_code = property_info.get("state_code") or None

    evaluation = PropertyEvaluation(
        user_id=user_id,
        journey_step_id=data.journey_step_id,
        name=data.name,
        share_id=secrets.token_urlsafe(8),
        purchase_price=purchase_price,
        square_meters=square_meters,
        state_code=state_code,
        inputs=data.inputs,
        cashflow_after_tax=results["monthly_cashflow_after_tax"],
        gross_rental_yield=results["gross_rental_yield"] * 100,
        return_on_equity=results.get("final_equity_kpi", 0),
        is_positive_cashflow=results["monthly_cashflow_after_tax"] >= 0,
        results=results,
    )
    session.add(evaluation)

    if data.journey_step_id:
        _auto_complete_evaluation_task(session, data.journey_step_id)

    session.commit()
    session.refresh(evaluation)
    return evaluation


def get_evaluation(
    session: Session,
    eval_id: uuid.UUID,
    user_id: uuid.UUID,
) -> PropertyEvaluation:
    """Get an evaluation by ID with ownership check."""
    evaluation = session.get(PropertyEvaluation, eval_id)
    if not evaluation or evaluation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found",
        )
    return evaluation


def get_by_share_id(session: Session, share_id: str) -> PropertyEvaluation:
    """Get an evaluation by share_id (no auth required)."""
    statement = select(PropertyEvaluation).where(
        PropertyEvaluation.share_id == share_id,
    )
    evaluation = session.exec(statement).first()
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared evaluation not found",
        )
    return evaluation


def list_user_evaluations(
    session: Session,
    user_id: uuid.UUID,
) -> list[PropertyEvaluation]:
    """Get all saved evaluations for a user, newest first."""
    statement = (
        select(PropertyEvaluation)
        .where(PropertyEvaluation.user_id == user_id)
        .order_by(PropertyEvaluation.created_at.desc())
    )
    return list(session.exec(statement).all())


def list_step_evaluations(
    session: Session,
    journey_step_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[PropertyEvaluation]:
    """Get evaluations for a specific journey step owned by the user, newest first."""
    statement = (
        select(PropertyEvaluation)
        .where(PropertyEvaluation.journey_step_id == journey_step_id)
        .where(PropertyEvaluation.user_id == user_id)
        .order_by(PropertyEvaluation.created_at.desc())
    )
    return list(session.exec(statement).all())


def delete_evaluation(
    session: Session,
    eval_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Delete an evaluation with ownership check."""
    evaluation = get_evaluation(session, eval_id, user_id)
    session.delete(evaluation)
    session.commit()
