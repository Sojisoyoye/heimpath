"""ROI calculator service.

Handles ROI calculations, investment grading, 10-year projections,
and CRUD operations for saved ROI calculations.
"""

import secrets
import uuid
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.roi import ROICalculation
from app.schemas.roi import ROICalculationCreate

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class ROIBreakdown:
    """Intermediate result of an ROI calculation."""

    gross_rental_income: float
    net_operating_income: float
    annual_cash_flow: float
    monthly_mortgage_payment: float
    gross_yield: float
    net_yield: float
    cap_rate: float
    cash_on_cash_return: float
    investment_grade: float
    investment_grade_label: str


# ---------------------------------------------------------------------------
# Calculation helpers
# ---------------------------------------------------------------------------


def calculate_mortgage_payment(
    principal: float,
    annual_rate: float,
    term_years: int,
) -> float:
    """Calculate monthly mortgage payment using standard amortization formula.

    Args:
        principal: Loan amount in EUR.
        annual_rate: Annual interest rate as percentage (e.g. 4.0 for 4%).
        term_years: Mortgage term in years.

    Returns:
        Monthly payment amount.
    """
    if principal <= 0 or annual_rate <= 0 or term_years <= 0:
        return 0.0

    monthly_rate = annual_rate / 100 / 12
    num_payments = term_years * 12

    return (principal * monthly_rate * (1 + monthly_rate) ** num_payments) / (
        (1 + monthly_rate) ** num_payments - 1
    )


def _score_gross_yield(gross_yield_pct: float) -> float:
    """Score gross yield on 0-10 scale."""
    if gross_yield_pct >= 8:
        return 10.0
    if gross_yield_pct >= 6:
        return 8.0
    if gross_yield_pct >= 4:
        return 6.0
    if gross_yield_pct >= 2:
        return 3.0
    return 0.0


def _score_cap_rate(cap_rate_pct: float) -> float:
    """Score cap rate on 0-10 scale."""
    if cap_rate_pct >= 7:
        return 10.0
    if cap_rate_pct >= 5:
        return 7.0
    if cap_rate_pct >= 3:
        return 4.0
    return 0.0


def _score_cash_on_cash(coc_pct: float) -> float:
    """Score cash-on-cash return on 0-10 scale."""
    if coc_pct >= 15:
        return 10.0
    if coc_pct >= 10:
        return 8.0
    if coc_pct >= 5:
        return 6.0
    if coc_pct >= 0:
        return 3.0
    return 0.0


def _score_cash_flow(annual_cash_flow: float) -> float:
    """Score cash flow positivity on 0-10 scale."""
    if annual_cash_flow > 0:
        return 10.0
    if annual_cash_flow == 0:
        return 5.0
    return 0.0


def _score_vacancy(vacancy_rate_pct: float) -> float:
    """Score vacancy buffer on 0-10 scale (lower is better)."""
    if vacancy_rate_pct < 5:
        return 10.0
    if vacancy_rate_pct <= 15:
        return 6.0
    return 2.0


def _grade_label(grade: float) -> str:
    """Map numeric investment grade to label."""
    if grade >= 8:
        return "Excellent"
    if grade >= 6:
        return "Good"
    if grade >= 4:
        return "Moderate"
    if grade >= 2:
        return "Poor"
    return "Very Poor"


def calculate_roi(inputs: ROICalculationCreate) -> ROIBreakdown:
    """Compute all ROI metrics and investment grade from inputs.

    Args:
        inputs: Validated calculation inputs.

    Returns:
        ROIBreakdown with all computed values.
    """
    purchase_price = inputs.purchase_price
    down_payment = inputs.down_payment
    monthly_rent = inputs.monthly_rent
    monthly_expenses = inputs.monthly_expenses
    vacancy_rate = inputs.vacancy_rate / 100
    mortgage_rate = inputs.mortgage_rate
    mortgage_term = inputs.mortgage_term

    # Financing
    loan_amount = purchase_price - down_payment
    monthly_mortgage = calculate_mortgage_payment(
        loan_amount, mortgage_rate, mortgage_term
    )

    # Annual income
    gross_rental_income = monthly_rent * 12
    effective_rental_income = gross_rental_income * (1 - vacancy_rate)
    annual_expenses = monthly_expenses * 12
    net_operating_income = effective_rental_income - annual_expenses
    annual_mortgage = monthly_mortgage * 12
    annual_cash_flow = net_operating_income - annual_mortgage

    # Key metrics (as ratios)
    gross_yield = gross_rental_income / purchase_price
    net_yield = net_operating_income / purchase_price
    cap_rate = net_operating_income / purchase_price
    cash_on_cash_return = annual_cash_flow / down_payment if down_payment > 0 else 0.0

    # Investment grade scoring (weighted 0-10)
    gross_yield_pct = gross_yield * 100
    cap_rate_pct = cap_rate * 100
    coc_pct = cash_on_cash_return * 100

    grade = (
        _score_gross_yield(gross_yield_pct) * 0.25
        + _score_cap_rate(cap_rate_pct) * 0.25
        + _score_cash_on_cash(coc_pct) * 0.25
        + _score_cash_flow(annual_cash_flow) * 0.15
        + _score_vacancy(inputs.vacancy_rate) * 0.10
    )
    grade = round(grade, 1)

    return ROIBreakdown(
        gross_rental_income=gross_rental_income,
        net_operating_income=net_operating_income,
        annual_cash_flow=annual_cash_flow,
        monthly_mortgage_payment=monthly_mortgage,
        gross_yield=gross_yield,
        net_yield=net_yield,
        cap_rate=cap_rate,
        cash_on_cash_return=cash_on_cash_return,
        investment_grade=grade,
        investment_grade_label=_grade_label(grade),
    )


def calculate_projections(
    inputs: ROICalculationCreate,
    annual_cash_flow: float,
    monthly_mortgage_payment: float,
) -> list[dict]:
    """Calculate 10-year projections.

    Year-by-year: property value (appreciation), equity buildup
    (mortgage principal paydown), cumulative cash flow (2% annual rent increase),
    total return, ROI %.

    Args:
        inputs: Validated calculation inputs.
        annual_cash_flow: First-year annual cash flow.
        monthly_mortgage_payment: Monthly mortgage payment.

    Returns:
        List of 10 projection year dicts.
    """
    purchase_price = inputs.purchase_price
    down_payment = inputs.down_payment
    annual_appreciation = inputs.annual_appreciation / 100
    loan_amount = purchase_price - down_payment
    monthly_rate = inputs.mortgage_rate / 100 / 12

    projections = []
    cumulative_cash_flow = 0.0
    remaining_balance = loan_amount

    for year in range(1, 11):
        # Property value with appreciation
        property_value = purchase_price * (1 + annual_appreciation) ** year

        # Track mortgage principal paydown over the year
        for _ in range(12):
            if remaining_balance <= 0 or monthly_rate <= 0:
                break
            interest_payment = remaining_balance * monthly_rate
            principal_payment = monthly_mortgage_payment - interest_payment
            remaining_balance = max(0, remaining_balance - principal_payment)

        # Equity = property value - remaining balance
        equity = property_value - remaining_balance

        # Cash flow with 2% annual rent increase
        year_cash_flow = annual_cash_flow * (1.02 ** (year - 1))
        cumulative_cash_flow += year_cash_flow

        # Total return = appreciation + cumulative cash flow
        appreciation = property_value - purchase_price
        total_return = appreciation + cumulative_cash_flow
        total_return_percent = total_return / down_payment if down_payment > 0 else 0.0

        projections.append(
            {
                "year": year,
                "property_value": round(property_value, 2),
                "equity": round(equity, 2),
                "cumulative_cash_flow": round(cumulative_cash_flow, 2),
                "total_return": round(total_return, 2),
                "total_return_percent": round(total_return_percent, 4),
            }
        )

    return projections


# ---------------------------------------------------------------------------
# CRUD operations
# ---------------------------------------------------------------------------


def save_calculation(
    session: Session,
    user_id: uuid.UUID,
    inputs: ROICalculationCreate,
) -> ROICalculation:
    """Calculate, generate share_id, and persist.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.
        inputs: Validated calculation inputs.

    Returns:
        Persisted ROICalculation model.
    """
    breakdown = calculate_roi(inputs)
    projections = calculate_projections(
        inputs, breakdown.annual_cash_flow, breakdown.monthly_mortgage_payment
    )

    calculation = ROICalculation(
        user_id=user_id,
        name=inputs.name,
        share_id=secrets.token_urlsafe(8),
        # Inputs
        purchase_price=inputs.purchase_price,
        down_payment=inputs.down_payment,
        monthly_rent=inputs.monthly_rent,
        monthly_expenses=inputs.monthly_expenses,
        annual_appreciation=inputs.annual_appreciation,
        vacancy_rate=inputs.vacancy_rate,
        mortgage_rate=inputs.mortgage_rate,
        mortgage_term=inputs.mortgage_term,
        # Results
        gross_rental_income=breakdown.gross_rental_income,
        net_operating_income=breakdown.net_operating_income,
        annual_cash_flow=breakdown.annual_cash_flow,
        monthly_mortgage_payment=breakdown.monthly_mortgage_payment,
        gross_yield=breakdown.gross_yield,
        net_yield=breakdown.net_yield,
        cap_rate=breakdown.cap_rate,
        cash_on_cash_return=breakdown.cash_on_cash_return,
        investment_grade=breakdown.investment_grade,
        investment_grade_label=breakdown.investment_grade_label,
        # Projections
        projections=projections,
    )
    session.add(calculation)
    session.commit()
    session.refresh(calculation)
    return calculation


def get_calculation(
    session: Session,
    calc_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ROICalculation:
    """Get a calculation by ID with ownership check.

    Args:
        session: Sync database session.
        calc_id: Calculation UUID.
        user_id: Authenticated user's UUID.

    Returns:
        ROICalculation model.

    Raises:
        HTTPException: If not found or not owned by user.
    """
    calculation = session.get(ROICalculation, calc_id)
    if not calculation or calculation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ROI calculation not found",
        )
    return calculation


def get_by_share_id(session: Session, share_id: str) -> ROICalculation:
    """Get a calculation by share_id (no auth required).

    Args:
        session: Sync database session.
        share_id: Short URL-safe share identifier.

    Returns:
        ROICalculation model.

    Raises:
        HTTPException: If not found.
    """
    statement = select(ROICalculation).where(ROICalculation.share_id == share_id)
    calculation = session.exec(statement).first()
    if not calculation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared ROI calculation not found",
        )
    return calculation


def list_user_calculations(
    session: Session,
    user_id: uuid.UUID,
) -> list[ROICalculation]:
    """Get all saved ROI calculations for a user, newest first.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.

    Returns:
        List of ROICalculation models.
    """
    statement = (
        select(ROICalculation)
        .where(ROICalculation.user_id == user_id)
        .order_by(ROICalculation.created_at.desc())
    )
    return list(session.exec(statement).all())


def delete_calculation(
    session: Session,
    calc_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Delete a calculation with ownership check.

    Args:
        session: Sync database session.
        calc_id: Calculation UUID.
        user_id: Authenticated user's UUID.

    Raises:
        HTTPException: If not found or not owned by user.
    """
    calculation = get_calculation(session, calc_id, user_id)
    session.delete(calculation)
    session.commit()


def compare_scenarios(
    scenarios: list[ROICalculationCreate],
) -> list[dict]:
    """Compare multiple ROI scenarios (pure calculation, no persistence).

    Args:
        scenarios: List of 2-4 ROICalculationCreate inputs.

    Returns:
        List of result dicts with all metrics and projections.
    """
    results = []
    for inputs in scenarios:
        breakdown = calculate_roi(inputs)
        projections = calculate_projections(
            inputs, breakdown.annual_cash_flow, breakdown.monthly_mortgage_payment
        )
        results.append(
            {
                "name": inputs.name,
                "purchase_price": inputs.purchase_price,
                "down_payment": inputs.down_payment,
                "monthly_rent": inputs.monthly_rent,
                "gross_rental_income": breakdown.gross_rental_income,
                "net_operating_income": breakdown.net_operating_income,
                "annual_cash_flow": breakdown.annual_cash_flow,
                "monthly_mortgage_payment": breakdown.monthly_mortgage_payment,
                "gross_yield": breakdown.gross_yield,
                "net_yield": breakdown.net_yield,
                "cap_rate": breakdown.cap_rate,
                "cash_on_cash_return": breakdown.cash_on_cash_return,
                "investment_grade": breakdown.investment_grade,
                "investment_grade_label": breakdown.investment_grade_label,
                "projections": projections,
            }
        )
    return results
