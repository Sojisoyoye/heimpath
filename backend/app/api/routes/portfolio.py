"""Portfolio API endpoints."""

import uuid
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, SessionDep
from app.schemas.portfolio import (
    AnlageVSummaryResponse,
    CostSummaryResponse,
    PortfolioPerformanceResponse,
    PortfolioPropertyCreate,
    PortfolioPropertyListResponse,
    PortfolioPropertyResponse,
    PortfolioPropertyUpdate,
    PortfolioSummaryResponse,
    PortfolioTransactionCreate,
    PortfolioTransactionListResponse,
    PortfolioTransactionResponse,
)
from app.services import portfolio_service

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


# ---------------------------------------------------------------------------
# Property endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/properties",
    status_code=status.HTTP_201_CREATED,
)
async def create_property(
    body: PortfolioPropertyCreate,
    current_user: CurrentUser,
    session: SessionDep,
) -> PortfolioPropertyResponse:
    """Create a new portfolio property."""
    prop = portfolio_service.create_property(session, current_user.id, body)
    return PortfolioPropertyResponse.model_validate(prop)


@router.post(
    "/properties/from-journey/{journey_id}",
    status_code=status.HTTP_201_CREATED,
)
async def create_property_from_journey(
    journey_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> PortfolioPropertyResponse:
    """Create a portfolio property pre-filled from a completed journey."""
    prop = portfolio_service.create_property_from_journey(
        session, journey_id, current_user.id
    )
    return PortfolioPropertyResponse.model_validate(prop)


@router.get("/properties")
async def list_properties(
    current_user: CurrentUser,
    session: SessionDep,
) -> PortfolioPropertyListResponse:
    """List all properties for the current user."""
    properties = portfolio_service.list_user_properties(session, current_user.id)
    return PortfolioPropertyListResponse(
        data=properties,
        count=len(properties),
    )


@router.get("/properties/{property_id}")
async def get_property(
    property_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> PortfolioPropertyResponse:
    """Get a single property by ID."""
    prop = portfolio_service.get_property(session, property_id, current_user.id)
    return PortfolioPropertyResponse.model_validate(prop)


@router.patch("/properties/{property_id}")
async def update_property(
    property_id: uuid.UUID,
    body: PortfolioPropertyUpdate,
    current_user: CurrentUser,
    session: SessionDep,
) -> PortfolioPropertyResponse:
    """Partially update a property."""
    prop = portfolio_service.update_property(
        session, property_id, current_user.id, body
    )
    return PortfolioPropertyResponse.model_validate(prop)


@router.delete(
    "/properties/{property_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_property(
    property_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> None:
    """Delete a property and all its transactions."""
    portfolio_service.delete_property(session, property_id, current_user.id)


# ---------------------------------------------------------------------------
# Transaction endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/properties/{property_id}/transactions",
    status_code=status.HTTP_201_CREATED,
)
async def create_transaction(
    property_id: uuid.UUID,
    body: PortfolioTransactionCreate,
    current_user: CurrentUser,
    session: SessionDep,
) -> PortfolioTransactionResponse:
    """Create a transaction for a property."""
    txn = portfolio_service.create_transaction(
        session, property_id, current_user.id, body
    )
    return PortfolioTransactionResponse.model_validate(txn)


@router.get("/properties/{property_id}/transactions")
async def list_transactions(
    property_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> PortfolioTransactionListResponse:
    """List transactions for a property with optional date filtering."""
    transactions = portfolio_service.list_transactions(
        session, property_id, current_user.id, date_from=date_from, date_to=date_to
    )
    return PortfolioTransactionListResponse(
        data=transactions,
        count=len(transactions),
    )


@router.delete(
    "/transactions/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_transaction(
    transaction_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> None:
    """Delete a transaction."""
    portfolio_service.delete_transaction(session, transaction_id, current_user.id)


# ---------------------------------------------------------------------------
# Cost Summary endpoint
# ---------------------------------------------------------------------------


@router.get("/properties/{property_id}/cost-summary")
async def get_cost_summary(
    property_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> CostSummaryResponse:
    """Get running-cost summary for a property."""
    summary = portfolio_service.calculate_cost_summary(
        session, property_id, current_user.id, date_from=date_from, date_to=date_to
    )
    return CostSummaryResponse(**summary)


# ---------------------------------------------------------------------------
# Anlage V tax summary endpoint
# ---------------------------------------------------------------------------


@router.get("/properties/{property_id}/tax-summary")
async def get_tax_summary(
    property_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
    year: Annotated[int, Query(ge=1900, le=2100)] = datetime.now(timezone.utc).year - 1,
) -> AnlageVSummaryResponse:
    """Get Anlage V rental income tax summary for a property and calendar year."""
    return portfolio_service.calculate_anlage_v_summary(
        session, property_id, current_user.id, year
    )


# ---------------------------------------------------------------------------
# Performance endpoint
# ---------------------------------------------------------------------------


@router.get("/performance")
async def get_portfolio_performance(
    current_user: CurrentUser,
    session: SessionDep,
) -> PortfolioPerformanceResponse:
    """Get monthly income/expenses/net cash flow for the trailing 12 months."""
    data = portfolio_service.calculate_monthly_performance(session, current_user.id)
    return PortfolioPerformanceResponse(**data)


# ---------------------------------------------------------------------------
# Summary endpoint
# ---------------------------------------------------------------------------


@router.get("/summary")
async def get_portfolio_summary(
    current_user: CurrentUser,
    session: SessionDep,
) -> PortfolioSummaryResponse:
    """Get aggregated KPIs across the entire portfolio."""
    summary = portfolio_service.calculate_portfolio_summary(session, current_user.id)
    return PortfolioSummaryResponse(**summary)
