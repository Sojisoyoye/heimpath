"""Hidden cost calculator service.

Handles cost calculations, state rate lookups, state comparisons,
and CRUD operations for saved calculations.
"""
import secrets
import uuid

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.calculator import HiddenCostCalculation
from app.schemas.calculator import (
    CostDefaults,
    HiddenCostCalculationCreate,
    StateComparisonItem,
    StateRate,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STATE_RATES: dict[str, tuple[str, float]] = {
    "BW": ("Baden-Württemberg", 5.0),
    "BY": ("Bayern", 3.5),
    "BE": ("Berlin", 6.0),
    "BB": ("Brandenburg", 6.5),
    "HB": ("Bremen", 5.0),
    "HH": ("Hamburg", 5.5),
    "HE": ("Hessen", 6.0),
    "MV": ("Mecklenburg-Vorpommern", 6.0),
    "NI": ("Niedersachsen", 5.0),
    "NW": ("Nordrhein-Westfalen", 6.5),
    "RP": ("Rheinland-Pfalz", 5.0),
    "SL": ("Saarland", 6.5),
    "SN": ("Sachsen", 5.5),
    "ST": ("Sachsen-Anhalt", 5.0),
    "SH": ("Schleswig-Holstein", 6.5),
    "TH": ("Thüringen", 6.5),
}

COST_DEFAULTS = CostDefaults(
    notary_fee_percent=1.5,
    land_registry_fee_percent=0.5,
    agent_commission_percent=3.57,
)

RENOVATION_MULTIPLIERS: dict[str, float] = {
    "none": 0.0,
    "light": 0.03,
    "medium": 0.08,
    "full": 0.15,
}

MOVING_COST_ESTIMATE = 3000.0


# ---------------------------------------------------------------------------
# Calculation helpers
# ---------------------------------------------------------------------------

class CostBreakdown:
    """Intermediate result of a cost calculation."""

    def __init__(
        self,
        transfer_tax: float,
        notary_fee: float,
        land_registry_fee: float,
        agent_commission: float,
        renovation_estimate: float,
        moving_costs: float,
    ):
        self.transfer_tax = transfer_tax
        self.notary_fee = notary_fee
        self.land_registry_fee = land_registry_fee
        self.agent_commission = agent_commission
        self.renovation_estimate = renovation_estimate
        self.moving_costs = moving_costs
        self.total_additional_costs = (
            transfer_tax
            + notary_fee
            + land_registry_fee
            + agent_commission
            + renovation_estimate
            + moving_costs
        )


def calculate(inputs: HiddenCostCalculationCreate) -> CostBreakdown:
    """Pure math calculation from inputs, no DB access.

    Args:
        inputs: Validated calculation inputs.

    Returns:
        CostBreakdown with all computed values.

    Raises:
        HTTPException: If the state code is invalid.
    """
    state_entry = STATE_RATES.get(inputs.state_code)
    if not state_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state code: {inputs.state_code}",
        )

    _, transfer_tax_rate = state_entry
    price = inputs.property_price

    transfer_tax = price * (transfer_tax_rate / 100)
    notary_fee = price * (COST_DEFAULTS.notary_fee_percent / 100)
    land_registry_fee = price * (COST_DEFAULTS.land_registry_fee_percent / 100)
    agent_commission = (
        price * (COST_DEFAULTS.agent_commission_percent / 100)
        if inputs.include_agent
        else 0.0
    )
    renovation_estimate = price * RENOVATION_MULTIPLIERS.get(inputs.renovation_level, 0.0)
    moving_costs = MOVING_COST_ESTIMATE if inputs.include_moving else 0.0

    return CostBreakdown(
        transfer_tax=transfer_tax,
        notary_fee=notary_fee,
        land_registry_fee=land_registry_fee,
        agent_commission=agent_commission,
        renovation_estimate=renovation_estimate,
        moving_costs=moving_costs,
    )


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def get_state_rates() -> list[StateRate]:
    """Return all 16 German states with their transfer tax rates."""
    return [
        StateRate(state_code=code, state_name=name, transfer_tax_rate=rate)
        for code, (name, rate) in sorted(STATE_RATES.items(), key=lambda x: x[1][0])
    ]


def compare_states(property_price: float, include_agent: bool) -> list[StateComparisonItem]:
    """Compare costs across all states for a given price.

    Args:
        property_price: Property price in EUR.
        include_agent: Whether to include agent commission.

    Returns:
        List of StateComparisonItem sorted by total_cost ascending.
    """
    notary_fee = property_price * (COST_DEFAULTS.notary_fee_percent / 100)
    land_registry_fee = property_price * (COST_DEFAULTS.land_registry_fee_percent / 100)
    agent_commission = (
        property_price * (COST_DEFAULTS.agent_commission_percent / 100)
        if include_agent
        else 0.0
    )

    items: list[StateComparisonItem] = []
    for code, (name, rate) in STATE_RATES.items():
        transfer_tax = property_price * (rate / 100)
        total = transfer_tax + notary_fee + land_registry_fee + agent_commission
        items.append(
            StateComparisonItem(
                state_code=code,
                state_name=name,
                transfer_tax_rate=rate,
                transfer_tax=transfer_tax,
                notary_fee=notary_fee,
                land_registry_fee=land_registry_fee,
                agent_commission=agent_commission,
                total_cost=total,
            )
        )

    items.sort(key=lambda x: x.total_cost)
    return items


# ---------------------------------------------------------------------------
# CRUD operations
# ---------------------------------------------------------------------------

def save_calculation(
    session: Session,
    user_id: uuid.UUID,
    inputs: HiddenCostCalculationCreate,
) -> HiddenCostCalculation:
    """Calculate, generate share_id, and persist.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.
        inputs: Validated calculation inputs.

    Returns:
        Persisted HiddenCostCalculation model.
    """
    breakdown = calculate(inputs)
    total_cost_of_ownership = inputs.property_price + breakdown.total_additional_costs
    additional_cost_percentage = (breakdown.total_additional_costs / inputs.property_price) * 100

    calculation = HiddenCostCalculation(
        user_id=user_id,
        name=inputs.name,
        share_id=secrets.token_urlsafe(8),
        # Inputs
        property_price=inputs.property_price,
        state_code=inputs.state_code,
        property_type=inputs.property_type,
        include_agent=inputs.include_agent,
        renovation_level=inputs.renovation_level,
        include_moving=inputs.include_moving,
        # Results
        transfer_tax=breakdown.transfer_tax,
        notary_fee=breakdown.notary_fee,
        land_registry_fee=breakdown.land_registry_fee,
        agent_commission=breakdown.agent_commission,
        renovation_estimate=breakdown.renovation_estimate,
        moving_costs=breakdown.moving_costs,
        total_additional_costs=breakdown.total_additional_costs,
        total_cost_of_ownership=total_cost_of_ownership,
        additional_cost_percentage=additional_cost_percentage,
    )
    session.add(calculation)
    session.commit()
    session.refresh(calculation)
    return calculation


def get_calculation(
    session: Session,
    calc_id: uuid.UUID,
    user_id: uuid.UUID,
) -> HiddenCostCalculation:
    """Get a calculation by ID with ownership check.

    Args:
        session: Sync database session.
        calc_id: Calculation UUID.
        user_id: Authenticated user's UUID.

    Returns:
        HiddenCostCalculation model.

    Raises:
        HTTPException: If not found or not owned by user.
    """
    calculation = session.get(HiddenCostCalculation, calc_id)
    if not calculation or calculation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calculation not found",
        )
    return calculation


def get_by_share_id(session: Session, share_id: str) -> HiddenCostCalculation:
    """Get a calculation by share_id (no auth required).

    Args:
        session: Sync database session.
        share_id: Short URL-safe share identifier.

    Returns:
        HiddenCostCalculation model.

    Raises:
        HTTPException: If not found.
    """
    statement = select(HiddenCostCalculation).where(
        HiddenCostCalculation.share_id == share_id
    )
    calculation = session.exec(statement).first()
    if not calculation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared calculation not found",
        )
    return calculation


def list_user_calculations(
    session: Session,
    user_id: uuid.UUID,
) -> list[HiddenCostCalculation]:
    """Get all saved calculations for a user, newest first.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.

    Returns:
        List of HiddenCostCalculation models.
    """
    statement = (
        select(HiddenCostCalculation)
        .where(HiddenCostCalculation.user_id == user_id)
        .order_by(HiddenCostCalculation.created_at.desc())
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
