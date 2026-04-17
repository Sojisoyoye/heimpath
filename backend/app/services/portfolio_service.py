"""Portfolio property and transaction service.

Handles CRUD operations for rental properties and financial transactions,
plus KPI calculations for the portfolio dashboard.
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.portfolio import (
    INCOME_TYPES,
    PortfolioProperty,
    PortfolioTransaction,
)
from app.schemas.portfolio import (
    PortfolioPropertyCreate,
    PortfolioPropertyUpdate,
    PortfolioTransactionCreate,
)

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
    income_types_values = {t.value for t in INCOME_TYPES}
    total_income = sum(t.amount for t in transactions if t.type in income_types_values)
    total_expenses = sum(
        t.amount for t in transactions if t.type not in income_types_values
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
