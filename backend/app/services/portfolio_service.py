"""Portfolio property and transaction service.

Handles CRUD operations for rental properties and financial transactions,
plus KPI calculations for the portfolio dashboard.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, timedelta

from dateutil.relativedelta import relativedelta
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.journey import Journey
from app.models.portfolio import (
    INCOME_TYPES,
    PortfolioProperty,
    PortfolioTransaction,
    RecurrenceInterval,
    TransactionType,
)
from app.schemas.portfolio import (
    AnlageVLineItem,
    AnlageVSummaryResponse,
    PortfolioPropertyCreate,
    PortfolioPropertyUpdate,
    PortfolioTransactionCreate,
)
from app.services.calculator_service import STATE_RATES

# Pre-compute income type string values for fast membership checks
_INCOME_TYPE_VALUES = {t.value for t in INCOME_TYPES}

# ---------------------------------------------------------------------------
# Property CRUD
# ---------------------------------------------------------------------------


def create_property(
    session: Session,
    user_id: uuid.UUID,
    data: PortfolioPropertyCreate,
) -> PortfolioProperty:
    """Create a new portfolio property.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.
        data: Validated property creation data.

    Returns:
        Persisted PortfolioProperty model.
    """
    prop = PortfolioProperty(user_id=user_id, **data.model_dump())
    session.add(prop)
    session.commit()
    session.refresh(prop)
    return prop


def get_property(
    session: Session,
    property_id: uuid.UUID,
    user_id: uuid.UUID,
) -> PortfolioProperty:
    """Get a property by ID with ownership check.

    Args:
        session: Sync database session.
        property_id: Property UUID.
        user_id: Authenticated user's UUID.

    Returns:
        PortfolioProperty model.

    Raises:
        HTTPException: If not found or not owned by user.
    """
    prop = session.get(PortfolioProperty, property_id)
    if not prop or prop.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )
    return prop


def list_user_properties(
    session: Session,
    user_id: uuid.UUID,
) -> list[PortfolioProperty]:
    """Get all properties for a user, newest first.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.

    Returns:
        List of PortfolioProperty models.
    """
    statement = (
        select(PortfolioProperty)
        .where(PortfolioProperty.user_id == user_id)
        .order_by(PortfolioProperty.created_at.desc())
    )
    return list(session.exec(statement).all())


def update_property(
    session: Session,
    property_id: uuid.UUID,
    user_id: uuid.UUID,
    data: PortfolioPropertyUpdate,
) -> PortfolioProperty:
    """Partially update a property.

    Args:
        session: Sync database session.
        property_id: Property UUID.
        user_id: Authenticated user's UUID.
        data: Validated partial update data.

    Returns:
        Updated PortfolioProperty model.

    Raises:
        HTTPException: If not found or not owned by user.
    """
    prop = get_property(session, property_id, user_id)
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(prop, key, value)
    session.add(prop)
    session.commit()
    session.refresh(prop)
    return prop


def delete_property(
    session: Session,
    property_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Delete a property with ownership check.

    Args:
        session: Sync database session.
        property_id: Property UUID.
        user_id: Authenticated user's UUID.

    Raises:
        HTTPException: If not found or not owned by user.
    """
    prop = get_property(session, property_id, user_id)
    session.delete(prop)
    session.commit()


def create_property_from_journey(
    session: Session,
    journey_id: uuid.UUID,
    user_id: uuid.UUID,
) -> PortfolioProperty:
    """Create a portfolio property pre-filled from a completed journey.

    Args:
        session: Sync database session.
        journey_id: Journey UUID to link from.
        user_id: Authenticated user's UUID.

    Returns:
        Persisted PortfolioProperty model.

    Raises:
        HTTPException: If journey not found or not owned by user.
        HTTPException: If a portfolio property already exists for this journey.
    """
    journey = session.get(Journey, journey_id)
    if not journey or journey.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    existing = session.exec(
        select(PortfolioProperty).where(
            PortfolioProperty.journey_id == journey_id,
            PortfolioProperty.user_id == user_id,
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A portfolio property already exists for this journey",
        )

    property_type = journey.property_type or "apartment"
    location_code = journey.property_location or ""
    state_entry = STATE_RATES.get(location_code)
    state_name = state_entry[0] if state_entry else location_code

    prop = PortfolioProperty(
        user_id=user_id,
        journey_id=journey_id,
        address=f"{property_type.capitalize()} in {state_name}",
        city=state_name,
        postcode="",
        state_code=location_code[:2] if location_code else None,
        purchase_price=float(journey.budget_euros) if journey.budget_euros else 1.0,
        square_meters=1.0,
        is_vacant=journey.property_use == "rent_out",
    )
    session.add(prop)
    session.commit()
    session.refresh(prop)
    return prop


# ---------------------------------------------------------------------------
# Transaction CRUD
# ---------------------------------------------------------------------------


def create_transaction(
    session: Session,
    property_id: uuid.UUID,
    user_id: uuid.UUID,
    data: PortfolioTransactionCreate,
) -> PortfolioTransaction:
    """Create a transaction for a property.

    Verifies property ownership before creating.

    Args:
        session: Sync database session.
        property_id: Property UUID.
        user_id: Authenticated user's UUID.
        data: Validated transaction creation data.

    Returns:
        Persisted PortfolioTransaction model.

    Raises:
        HTTPException: If property not found or not owned by user.
    """
    get_property(session, property_id, user_id)

    txn = PortfolioTransaction(
        property_id=property_id,
        user_id=user_id,
        type=data.type,
        amount=data.amount,
        date=data.date,
        category=data.category,
        description=data.description,
        is_recurring=data.is_recurring,
        cost_category=data.cost_category,
        estimated_amount=data.estimated_amount,
        recurrence_interval=data.recurrence_interval,
    )
    session.add(txn)
    session.commit()
    session.refresh(txn)
    return txn


def list_transactions(
    session: Session,
    property_id: uuid.UUID,
    user_id: uuid.UUID,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[PortfolioTransaction]:
    """List transactions for a property with optional date filtering.

    Args:
        session: Sync database session.
        property_id: Property UUID.
        user_id: Authenticated user's UUID.
        date_from: Optional start date filter.
        date_to: Optional end date filter.

    Returns:
        List of PortfolioTransaction models.

    Raises:
        HTTPException: If property not found or not owned by user.
    """
    get_property(session, property_id, user_id)

    statement = (
        select(PortfolioTransaction)
        .where(PortfolioTransaction.property_id == property_id)
        .order_by(PortfolioTransaction.date.desc())
    )
    if date_from:
        statement = statement.where(PortfolioTransaction.date >= date_from)
    if date_to:
        statement = statement.where(PortfolioTransaction.date <= date_to)

    return list(session.exec(statement).all())


def delete_transaction(
    session: Session,
    transaction_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Delete a transaction with ownership check.

    Args:
        session: Sync database session.
        transaction_id: Transaction UUID.
        user_id: Authenticated user's UUID.

    Raises:
        HTTPException: If not found or not owned by user.
    """
    txn = session.get(PortfolioTransaction, transaction_id)
    if not txn or txn.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    session.delete(txn)
    session.commit()


# ---------------------------------------------------------------------------
# Recurring transaction generation
# ---------------------------------------------------------------------------


def generate_recurring_transactions(
    session: Session,
    user_id: uuid.UUID | None = None,
) -> int:
    """Generate missing recurring transaction copies for the current period.

    Idempotent — safe to run multiple times in the same period.
    Template transactions are those with is_recurring=True and a
    recurrence_interval set. Generated copies have is_generated=True and
    is_recurring=False so they are not re-processed on the next run.

    Args:
        session: Sync database session.
        user_id: Optional UUID to scope generation to a single user.
                 When None (scheduler job), all users' templates are processed.

    Returns:
        Count of new transaction entries created.
    """
    today = date.today()
    statement = (
        select(PortfolioTransaction)
        .where(PortfolioTransaction.is_recurring == True)  # noqa: E712
        .where(PortfolioTransaction.recurrence_interval != None)  # noqa: E711
        .where(PortfolioTransaction.is_generated == False)  # noqa: E712
    )
    if user_id is not None:
        statement = statement.where(PortfolioTransaction.user_id == user_id)
    templates = list(session.exec(statement).all())

    created = 0
    for tmpl in templates:
        if tmpl.recurrence_interval == RecurrenceInterval.MONTHLY:
            if (
                tmpl.last_generated_date is not None
                and tmpl.last_generated_date.replace(day=1) == today.replace(day=1)
            ):
                continue
        elif tmpl.recurrence_interval == RecurrenceInterval.ANNUALLY:
            if (
                tmpl.last_generated_date is not None
                and tmpl.last_generated_date.year == today.year
            ):
                continue

        # recurrence_interval is intentionally omitted: generated copies are
        # one-time entries (is_recurring=False, is_generated=True) and must
        # not be re-processed as templates on subsequent scheduler runs.
        copy = PortfolioTransaction(
            property_id=tmpl.property_id,
            user_id=tmpl.user_id,
            type=tmpl.type,
            amount=tmpl.amount,
            date=today,
            category=tmpl.category,
            description=tmpl.description,
            is_recurring=False,
            is_generated=True,
            cost_category=tmpl.cost_category,
            estimated_amount=tmpl.estimated_amount,
        )
        session.add(copy)
        tmpl.last_generated_date = today
        created += 1

    if created > 0:
        session.commit()
    return created


# ---------------------------------------------------------------------------
# KPI calculation
# ---------------------------------------------------------------------------


def calculate_portfolio_summary(
    session: Session,
    user_id: uuid.UUID,
) -> dict:
    """Calculate aggregated KPIs across the entire portfolio.

    Uses two queries: one for properties, one for trailing-12-month
    transactions. Avoids N+1 by not querying per-property.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.

    Returns:
        Dict with total_properties, total_purchase_value, total_current_value,
        total_income, total_expenses, net_cash_flow, vacancy_rate,
        average_gross_yield.
    """
    # Fetch all user properties
    props_stmt = select(PortfolioProperty).where(PortfolioProperty.user_id == user_id)
    properties = list(session.exec(props_stmt).all())

    # Fetch trailing 12-month transactions
    twelve_months_ago = date.today() - timedelta(days=365)
    txn_stmt = (
        select(PortfolioTransaction)
        .where(PortfolioTransaction.user_id == user_id)
        .where(PortfolioTransaction.date >= twelve_months_ago)
    )
    transactions = list(session.exec(txn_stmt).all())

    if not properties:
        return {
            "total_properties": 0,
            "total_purchase_value": 0.0,
            "total_current_value": 0.0,
            "total_income": 0.0,
            "total_expenses": 0.0,
            "net_cash_flow": 0.0,
            "vacancy_rate": 0.0,
            "average_gross_yield": 0.0,
        }

    total_properties = len(properties)
    total_purchase_value = sum(p.purchase_price for p in properties)
    total_current_value = sum(
        p.current_value_estimate if p.current_value_estimate else p.purchase_price
        for p in properties
    )
    vacant_count = sum(1 for p in properties if p.is_vacant)

    # Aggregate transaction amounts by income/expense
    total_income = sum(t.amount for t in transactions if t.type in _INCOME_TYPE_VALUES)
    total_expenses = sum(
        t.amount for t in transactions if t.type not in _INCOME_TYPE_VALUES
    )
    net_cash_flow = total_income - total_expenses

    vacancy_rate = (vacant_count / total_properties) * 100
    average_gross_yield = (
        (total_income / total_purchase_value) * 100 if total_purchase_value > 0 else 0.0
    )

    return {
        "total_properties": total_properties,
        "total_purchase_value": total_purchase_value,
        "total_current_value": total_current_value,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_cash_flow": net_cash_flow,
        "vacancy_rate": vacancy_rate,
        "average_gross_yield": round(average_gross_yield, 2),
    }


def calculate_monthly_performance(
    session: Session,
    user_id: uuid.UUID,
) -> dict:
    """Calculate monthly income/expenses/net cash flow for the trailing 12 months.

    Returns one entry per month even if no transactions exist for that month.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.

    Returns:
        Dict with ``months`` list and ``has_data`` flag.
    """
    today = date.today()
    # Start of 11 months ago (12 months total including current)
    start_month = today.replace(day=1) - relativedelta(months=11)

    txn_stmt = (
        select(PortfolioTransaction)
        .where(PortfolioTransaction.user_id == user_id)
        .where(PortfolioTransaction.date >= start_month)
    )
    transactions = list(session.exec(txn_stmt).all())

    # Bucket transactions by YYYY-MM
    income_by_month: dict[str, float] = defaultdict(float)
    expense_by_month: dict[str, float] = defaultdict(float)

    for txn in transactions:
        key = txn.date.strftime("%Y-%m")
        if txn.type in _INCOME_TYPE_VALUES:
            income_by_month[key] += txn.amount
        else:
            expense_by_month[key] += txn.amount

    # Build 12-month series
    months: list[dict] = []
    cursor = start_month
    for _ in range(12):
        key = cursor.strftime("%Y-%m")
        income = round(income_by_month.get(key, 0.0), 2)
        expenses = round(expense_by_month.get(key, 0.0), 2)
        months.append(
            {
                "month": key,
                "income": income,
                "expenses": expenses,
                "net_cash_flow": round(income - expenses, 2),
            }
        )
        cursor += relativedelta(months=1)

    return {
        "months": months,
        "has_data": len(transactions) > 0,
    }


OVERCHARGE_THRESHOLD = 1.2  # 20 % over estimated triggers alert


def _build_category_summary(category: str, txns: list[PortfolioTransaction]) -> dict:
    """Build summary dict for a single cost category."""
    actual_total = sum(t.amount for t in txns)
    est_amounts = [t.estimated_amount for t in txns if t.estimated_amount is not None]
    estimated_total = sum(est_amounts) if est_amounts else None

    variance: float | None = None
    variance_percent: float | None = None
    is_over = False
    if estimated_total is not None and estimated_total > 0:
        variance = actual_total - estimated_total
        variance_percent = round((variance / estimated_total) * 100, 1)
        is_over = actual_total > estimated_total * OVERCHARGE_THRESHOLD

    return {
        "category": category,
        "actual_total": actual_total,
        "estimated_total": estimated_total,
        "variance": variance,
        "variance_percent": variance_percent,
        "is_over_threshold": is_over,
    }


def calculate_cost_summary(
    session: Session,
    property_id: uuid.UUID,
    user_id: uuid.UUID,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    """Calculate per-category running-cost summary for a property.

    Args:
        session: Sync database session.
        property_id: Property UUID.
        user_id: Authenticated user's UUID.
        date_from: Optional start date filter.
        date_to: Optional end date filter.

    Returns:
        Dict matching ``CostSummaryResponse`` shape.
    """
    get_property(session, property_id, user_id)

    statement = (
        select(PortfolioTransaction)
        .where(PortfolioTransaction.property_id == property_id)
        .where(PortfolioTransaction.cost_category.isnot(None))
    )
    if date_from:
        statement = statement.where(PortfolioTransaction.date >= date_from)
    if date_to:
        statement = statement.where(PortfolioTransaction.date <= date_to)

    transactions = list(session.exec(statement).all())

    grouped: dict[str, list[PortfolioTransaction]] = {}
    for txn in transactions:
        grouped.setdefault(txn.cost_category, []).append(txn)

    categories = []
    alert_categories: list[str] = []
    total_actual = 0.0
    total_estimated = 0.0
    has_any_estimated = False
    highest_category: str | None = None
    highest_actual = 0.0

    for cat, txns in sorted(grouped.items()):
        summary = _build_category_summary(cat, txns)
        categories.append(summary)

        if summary["is_over_threshold"]:
            alert_categories.append(cat)
        total_actual += summary["actual_total"]
        if summary["estimated_total"] is not None:
            total_estimated += summary["estimated_total"]
            has_any_estimated = True
        if summary["actual_total"] > highest_actual:
            highest_actual = summary["actual_total"]
            highest_category = cat

    total_var = total_actual - total_estimated if has_any_estimated else None

    return {
        "categories": categories,
        "total_actual": total_actual,
        "total_estimated": total_estimated if has_any_estimated else None,
        "total_variance": total_var,
        "highest_category": highest_category,
        "alert_categories": alert_categories,
    }


# ---------------------------------------------------------------------------
# Anlage V tax summary
# ---------------------------------------------------------------------------

_DEFAULT_LAND_SHARE = 20.0  # % — typical German suburban default


def _afa_rate_for_year(building_year: int) -> float:
    """Return the AfA depreciation rate for a given construction year (§ 7 EStG)."""
    if building_year < 1925:
        return 2.5
    if building_year >= 2023:
        return 3.0
    return 2.0


def calculate_anlage_v_summary(
    session: Session,
    property_id: uuid.UUID,
    user_id: uuid.UUID,
    year: int,
) -> AnlageVSummaryResponse:
    """Build an Anlage V (§ 21 EStG) rental income tax summary for a calendar year.

    Aggregates all transactions recorded for *property_id* in *year*, adds an
    AfA deduction computed from the property's purchase price and building year,
    and returns the full summary aligned to the official Anlage V line numbers.

    Args:
        session: Sync database session.
        property_id: Property UUID.
        user_id: Authenticated user's UUID.
        year: Calendar year (e.g. 2025).

    Returns:
        AnlageVSummaryResponse with every Werbungskosten line item.

    Raises:
        HTTPException: If property not found or not owned by user.
    """
    prop = get_property(session, property_id, user_id)

    if prop.purchase_price <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Purchase price must be greater than zero to compute AfA.",
        )

    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31)
    stmt = (
        select(PortfolioTransaction)
        .where(PortfolioTransaction.property_id == property_id)
        .where(PortfolioTransaction.user_id == user_id)
        .where(PortfolioTransaction.date >= year_start)
        .where(PortfolioTransaction.date <= year_end)
    )
    transactions = list(session.exec(stmt).all())

    # --- Aggregate by transaction type ---
    # Only RENT_INCOME maps to Anlage V Zeile 9 (Mieteinnahmen).
    # OTHER_INCOME (e.g. utility reimbursements) is shown separately (Zeile 21).
    gross_rent = 0.0
    other_income = 0.0
    mortgage_interest = 0.0
    hausgeld = 0.0
    insurance = 0.0
    maintenance = 0.0
    grundsteuer = 0.0
    other_wk = 0.0

    for txn in transactions:
        txn_type = txn.type
        if txn_type == TransactionType.RENT_INCOME:
            gross_rent += txn.amount
        elif txn_type == TransactionType.OTHER_INCOME:
            other_income += txn.amount
        elif txn_type == TransactionType.MORTGAGE_INTEREST:
            mortgage_interest += txn.amount
        elif txn_type == TransactionType.HAUSGELD:
            hausgeld += txn.amount
        elif txn_type == TransactionType.INSURANCE:
            insurance += txn.amount
        elif txn_type == TransactionType.MAINTENANCE:
            maintenance += txn.amount
        elif txn_type == TransactionType.TAX_PAYMENT:
            grundsteuer += txn.amount
        elif txn_type in (
            TransactionType.OPERATING_EXPENSE,
            TransactionType.OTHER_EXPENSE,
        ):
            other_wk += txn.amount

    # --- AfA calculation (§ 7 EStG) ---
    land_share_pct = (
        prop.land_share if prop.land_share is not None else _DEFAULT_LAND_SHARE
    )
    building_year = prop.building_year
    if building_year is not None:
        afa_rate = _afa_rate_for_year(building_year)
    else:
        afa_rate = 2.0  # conservative default when building year is unknown

    building_value = prop.purchase_price * (1.0 - land_share_pct / 100.0)
    afa_deduction = building_value * (afa_rate / 100.0)

    total_wk = (
        afa_deduction
        + mortgage_interest
        + hausgeld
        + insurance
        + maintenance
        + grundsteuer
        + other_wk
    )
    total_income = gross_rent + other_income
    net_taxable = total_income - total_wk

    line_items = [
        AnlageVLineItem(
            label="Gross rental income (Mieteinnahmen)",
            anlage_v_zeile="Zeile 9",
            amount=round(gross_rent, 2),
        ),
        AnlageVLineItem(
            label="Other income (sonstige Einnahmen)",
            anlage_v_zeile="Zeile 21",
            amount=round(other_income, 2),
        ),
        AnlageVLineItem(
            label="AfA depreciation (§ 7 EStG)",
            anlage_v_zeile="Zeile 33",
            amount=round(afa_deduction, 2),
        ),
        AnlageVLineItem(
            label="Mortgage interest (Schuldzinsen)",
            anlage_v_zeile="Zeile 35",
            amount=round(mortgage_interest, 2),
        ),
        AnlageVLineItem(
            label="Hausgeld / Nebenkosten",
            anlage_v_zeile="Zeile 50",
            amount=round(hausgeld, 2),
        ),
        AnlageVLineItem(
            label="Insurance (Versicherungen)",
            anlage_v_zeile="Zeile 48",
            amount=round(insurance, 2),
        ),
        AnlageVLineItem(
            label="Maintenance (Erhaltungsaufwand)",
            anlage_v_zeile="Zeile 40",
            amount=round(maintenance, 2),
        ),
        AnlageVLineItem(
            label="Grundsteuer",
            anlage_v_zeile="Zeile 47",
            amount=round(grundsteuer, 2),
        ),
        AnlageVLineItem(
            label="Other Werbungskosten",
            anlage_v_zeile="Zeile 53",
            amount=round(other_wk, 2),
        ),
    ]

    return AnlageVSummaryResponse(
        year=year,
        property_id=property_id,
        gross_rent_income=round(gross_rent, 2),
        other_income=round(other_income, 2),
        afa_rate_percent=afa_rate,
        building_value=round(building_value, 2),
        land_share_percent=land_share_pct,
        afa_deduction=round(afa_deduction, 2),
        mortgage_interest=round(mortgage_interest, 2),
        hausgeld=round(hausgeld, 2),
        insurance=round(insurance, 2),
        maintenance=round(maintenance, 2),
        grundsteuer=round(grundsteuer, 2),
        other_werbungskosten=round(other_wk, 2),
        total_werbungskosten=round(total_wk, 2),
        net_taxable_income=round(net_taxable, 2),
        line_items=line_items,
    )
