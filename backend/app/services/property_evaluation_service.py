"""Property evaluation calculator service.

Handles evaluation calculations, CRUD operations for saved evaluations,
and auto-completion of journey tasks.
"""

import secrets
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.journey import JourneyTask
from app.models.property_evaluation import PropertyEvaluation
from app.schemas.property_evaluation import PropertyEvaluationCreate

# ---------------------------------------------------------------------------
# Calculation
# ---------------------------------------------------------------------------


def calculate_results(inputs: dict) -> dict:
    """Mirror frontend usePropertyEvaluation logic server-side.

    Args:
        inputs: PropertyEvaluationState dict with propertyInfo, rent,
                operatingCosts, financing sub-objects.

    Returns:
        EvaluationResults dict.

    Raises:
        HTTPException: If required inputs are missing or invalid.
    """
    try:
        property_info = inputs["property_info"]
        rent = inputs["rent"]
        operating_costs = inputs["operating_costs"]
        financing = inputs["financing"]
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required input section: {e}",
        )

    purchase_price = property_info.get("purchase_price", 0)
    square_meters = property_info.get("square_meters", 0)

    if purchase_price <= 0 or square_meters <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="purchase_price and square_meters must be positive",
        )

    # Property metrics
    price_per_sqm = purchase_price / square_meters

    total_incidental_costs_percent = (
        property_info.get("broker_fee_percent", 0)
        + property_info.get("notary_fee_percent", 0)
        + property_info.get("land_registry_fee_percent", 0)
        + property_info.get("transfer_tax_percent", 0)
    )
    total_incidental_costs = purchase_price * (total_incidental_costs_percent / 100)
    total_investment = purchase_price + total_incidental_costs

    # Operating costs
    hausgeld_allocable = operating_costs.get("hausgeld_allocable", 0)
    property_tax_monthly = operating_costs.get("property_tax_monthly", 0)
    hausgeld_non_allocable = operating_costs.get("hausgeld_non_allocable", 0)
    reserves_portion = operating_costs.get("reserves_portion", 0)

    total_allocable_costs = hausgeld_allocable + property_tax_monthly
    total_non_allocable_costs = hausgeld_non_allocable + reserves_portion
    total_hausgeld = total_allocable_costs + total_non_allocable_costs

    # Rent metrics
    rent_per_sqm = rent.get("rent_per_sqm", 0)
    parking_rent = rent.get("parking_rent", 0)
    base_rent_monthly = rent_per_sqm * square_meters
    cold_rent_monthly = base_rent_monthly + parking_rent
    warm_rent_monthly = cold_rent_monthly + total_allocable_costs
    net_cold_rent_yearly = cold_rent_monthly * 12

    gross_rental_yield = (
        (net_cold_rent_yearly / purchase_price) * 100 if purchase_price else 0
    )
    cold_rent_factor = (
        purchase_price / net_cold_rent_yearly if net_cold_rent_yearly > 0 else 0
    )

    # Financing
    loan_percent = financing.get("loan_percent", 0)
    interest_rate_percent = financing.get("interest_rate_percent", 0)
    repayment_rate_percent = financing.get("repayment_rate_percent", 0)

    loan_amount = purchase_price * (loan_percent / 100)
    equity_amount = total_investment - loan_amount

    monthly_interest = (loan_amount * (interest_rate_percent / 100)) / 12
    monthly_repayment = (loan_amount * (repayment_rate_percent / 100)) / 12
    debt_service_monthly = monthly_interest + monthly_repayment

    # Tax
    building_share_percent = rent.get("building_share_percent", 0)
    depreciation_rate_percent = rent.get("depreciation_rate_percent", 0)
    marginal_tax_rate_percent = rent.get("marginal_tax_rate_percent", 0)

    building_value = (
        purchase_price * (building_share_percent / 100) + total_incidental_costs
    )
    depreciation_yearly = building_value * (depreciation_rate_percent / 100)
    depreciation_monthly = depreciation_yearly / 12
    interest_yearly = monthly_interest * 12

    taxable_cashflow_monthly = (
        warm_rent_monthly - total_hausgeld - monthly_interest - depreciation_monthly
    )
    taxable_income = taxable_cashflow_monthly * 12
    tax_yearly = taxable_income * (marginal_tax_rate_percent / 100)
    tax_monthly = tax_yearly / 12

    # Cashflow
    cashflow_before_tax = warm_rent_monthly - total_hausgeld - debt_service_monthly
    cashflow_after_tax = cashflow_before_tax - abs(tax_monthly)
    is_positive_cashflow = cashflow_after_tax >= 0

    # Returns
    net_cold_rent_after_costs = net_cold_rent_yearly - total_non_allocable_costs * 12
    net_rental_yield = (
        (net_cold_rent_after_costs / purchase_price) * 100 if purchase_price else 0
    )

    annual_cashflow = cashflow_after_tax * 12
    value_increase_percent = rent.get("value_increase_percent", 0)
    annual_appreciation = purchase_price * (value_increase_percent / 100)

    return_on_equity = (
        ((annual_cashflow + annual_appreciation) / equity_amount) * 100
        if equity_amount > 0
        else 0
    )
    return_on_equity_without_appreciation = (
        (annual_cashflow / equity_amount) * 100 if equity_amount > 0 else 0
    )

    return {
        "price_per_sqm": price_per_sqm,
        "total_incidental_costs_percent": total_incidental_costs_percent,
        "total_incidental_costs": total_incidental_costs,
        "total_investment": total_investment,
        "cold_rent_monthly": cold_rent_monthly,
        "warm_rent_monthly": warm_rent_monthly,
        "net_cold_rent_yearly": net_cold_rent_yearly,
        "gross_rental_yield": gross_rental_yield,
        "cold_rent_factor": cold_rent_factor,
        "total_allocable_costs": total_allocable_costs,
        "total_non_allocable_costs": total_non_allocable_costs,
        "total_hausgeld": total_hausgeld,
        "loan_amount": loan_amount,
        "equity_amount": equity_amount,
        "monthly_interest": monthly_interest,
        "monthly_repayment": monthly_repayment,
        "debt_service_monthly": debt_service_monthly,
        "depreciation_yearly": depreciation_yearly,
        "depreciation_monthly": depreciation_monthly,
        "interest_yearly": interest_yearly,
        "taxable_income": taxable_income,
        "taxable_cashflow_monthly": taxable_cashflow_monthly,
        "tax_yearly": tax_yearly,
        "tax_monthly": tax_monthly,
        "cashflow_before_tax": cashflow_before_tax,
        "cashflow_after_tax": cashflow_after_tax,
        "is_positive_cashflow": is_positive_cashflow,
        "net_rental_yield": net_rental_yield,
        "return_on_equity": return_on_equity,
        "return_on_equity_without_appreciation": return_on_equity_without_appreciation,
    }


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
        cashflow_after_tax=results["cashflow_after_tax"],
        gross_rental_yield=results["gross_rental_yield"],
        return_on_equity=results["return_on_equity"],
        is_positive_cashflow=results["is_positive_cashflow"],
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
) -> list[PropertyEvaluation]:
    """Get evaluations for a specific journey step, newest first."""
    statement = (
        select(PropertyEvaluation)
        .where(PropertyEvaluation.journey_step_id == journey_step_id)
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
