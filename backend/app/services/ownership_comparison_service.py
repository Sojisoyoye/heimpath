"""Ownership comparison service (GmbH vs. Private).

Calculates year-by-year tax impact for both ownership structures,
computes capital gains tax at exit, and determines breakeven point.
"""

import secrets
import uuid

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.ownership_comparison import OwnershipComparison
from app.schemas.ownership_comparison import OwnershipComparisonRequest

# ---------------------------------------------------------------------------
# Tax constants
# ---------------------------------------------------------------------------

# Körperschaftsteuer (corporate income tax)
KOERPERSCHAFTSTEUER_RATE = 0.15
# Solidaritätszuschlag (5.5% surcharge on income/corporate tax)
SOLI_SURCHARGE_RATE = 0.055
# Gewerbesteuer Messzahl (trade tax base rate)
GEWERBESTEUER_MESSZAHL = 0.035

# Capital gains — GmbH exit: only 5% of gains taxable (§8b KStG)
GMBH_CAPITAL_GAINS_TAXABLE_SHARE = 0.05

# Private capital gains tax (Abgeltungsteuer) for < 10 year holding
PRIVATE_CAPITAL_GAINS_TAX_RATE = 0.25
SOLI_ON_CAPITAL_GAINS_RATE = 0.055  # 5.5% Soli on the 25%

# Distribution tax: Kapitalertragsteuer + Soli
KAPEST_RATE = 0.25
SOLI_ON_KAPEST_RATE = 0.055  # 5.5% Soli on KapESt
DISTRIBUTION_TAX_RATE = KAPEST_RATE * (1 + SOLI_ON_KAPEST_RATE)  # ~26.375%


# ---------------------------------------------------------------------------
# Calculation helpers
# ---------------------------------------------------------------------------


def _calculate_gewerbesteuer_rate(hebesatz: float) -> float:
    """Calculate effective Gewerbesteuer rate from Hebesatz.

    Args:
        hebesatz: Municipal multiplier (e.g. 400 for 400%).

    Returns:
        Effective trade tax rate as decimal.
    """
    return GEWERBESTEUER_MESSZAHL * (hebesatz / 100)


def _calculate_gmbh_total_tax_rate(hebesatz: float) -> float:
    """Calculate total GmbH tax rate (KSt + Soli + GewSt).

    Args:
        hebesatz: Municipal Gewerbesteuer multiplier.

    Returns:
        Combined effective tax rate as decimal.
    """
    kst = KOERPERSCHAFTSTEUER_RATE
    soli = kst * SOLI_SURCHARGE_RATE
    gewst = _calculate_gewerbesteuer_rate(hebesatz)
    return kst + soli + gewst


def _calculate_private_tax_rate(marginal_rate_pct: float) -> float:
    """Calculate effective private income tax rate including Soli.

    Args:
        marginal_rate_pct: Personal marginal tax rate as percentage (0-45).

    Returns:
        Effective tax rate as decimal.
    """
    marginal = marginal_rate_pct / 100
    soli = marginal * SOLI_SURCHARGE_RATE
    return marginal + soli


def _calculate_private_exit_tax(
    capital_gains: float,
    holding_period: int,
    marginal_rate_pct: float,
) -> float:
    """Calculate capital gains tax for private ownership at exit.

    Private property held >= 10 years: tax-free (Spekulationsfrist).
    Under 10 years: taxed at personal marginal rate.

    Args:
        capital_gains: Total appreciation amount.
        holding_period: Years held.
        marginal_rate_pct: Personal marginal tax rate as percentage.

    Returns:
        Capital gains tax amount.
    """
    if holding_period >= 10 or capital_gains <= 0:
        return 0.0
    effective_rate = _calculate_private_tax_rate(marginal_rate_pct)
    return capital_gains * effective_rate


def _calculate_gmbh_exit_tax(
    capital_gains: float,
    hebesatz: float,
) -> float:
    """Calculate capital gains tax for GmbH exit (§8b KStG).

    Only 5% of gains are taxable, effectively ~1.5% tax rate.

    Args:
        capital_gains: Total appreciation amount.
        hebesatz: Municipal Gewerbesteuer multiplier.

    Returns:
        Capital gains tax amount.
    """
    if capital_gains <= 0:
        return 0.0
    taxable_amount = capital_gains * GMBH_CAPITAL_GAINS_TAXABLE_SHARE
    tax_rate = _calculate_gmbh_total_tax_rate(hebesatz)
    return taxable_amount * tax_rate


# ---------------------------------------------------------------------------
# Main calculation
# ---------------------------------------------------------------------------


def calculate_comparison(inputs: OwnershipComparisonRequest) -> dict:
    """Calculate GmbH vs. private ownership comparison.

    Builds year-by-year projections for both scenarios including
    rental income taxation, depreciation, and exit capital gains.

    Args:
        inputs: Validated comparison inputs.

    Returns:
        Dict with private/gmbh ScenarioResult data, breakeven_year,
        gmbh_advantage_at_exit, and recommendation.
    """
    # Derived values
    annual_depreciation = (
        inputs.total_property_value
        * (inputs.building_share_percent / 100)
        * (inputs.afa_rate_percent / 100)
    )
    gmbh_tax_rate = _calculate_gmbh_total_tax_rate(inputs.gewerbesteuer_hebesatz)
    private_tax_rate = _calculate_private_tax_rate(inputs.personal_marginal_tax_rate)

    # Year-by-year projections
    private_projections = []
    gmbh_projections = []
    private_cumulative = 0.0
    gmbh_cumulative = 0.0
    breakeven_year = None

    for year in range(1, inputs.holding_period + 1):
        rent_increase = (1 + inputs.annual_rent_increase_percent / 100) ** (year - 1)
        year_rental_income = inputs.annual_rental_income * rent_increase
        property_value = (
            inputs.total_property_value * (1 + inputs.annual_appreciation / 100) ** year
        )

        # --- Private scenario ---
        private_taxable = max(0, year_rental_income - annual_depreciation)
        private_tax = private_taxable * private_tax_rate
        private_net = year_rental_income - private_tax
        private_cumulative += private_net

        private_projections.append(
            {
                "year": year,
                "rental_income": round(year_rental_income, 2),
                "tax": round(private_tax, 2),
                "net_income_after_tax": round(private_net, 2),
                "cumulative_net_income": round(private_cumulative, 2),
                "property_value": round(property_value, 2),
            }
        )

        # --- GmbH scenario ---
        gmbh_taxable = max(
            0, year_rental_income - annual_depreciation - inputs.annual_accounting_cost
        )
        gmbh_corp_tax = gmbh_taxable * gmbh_tax_rate
        gmbh_net_corp = (
            year_rental_income - gmbh_corp_tax - inputs.annual_accounting_cost
        )

        # Account for setup cost in year 1
        if year == 1:
            gmbh_net_corp -= inputs.gmbh_setup_cost

        gmbh_cumulative += gmbh_net_corp

        gmbh_projections.append(
            {
                "year": year,
                "rental_income": round(year_rental_income, 2),
                "tax": round(gmbh_corp_tax, 2),
                "net_income_after_tax": round(gmbh_net_corp, 2),
                "cumulative_net_income": round(gmbh_cumulative, 2),
                "property_value": round(property_value, 2),
            }
        )

        # Check breakeven (GmbH cumulative overtakes private)
        if breakeven_year is None and gmbh_cumulative > private_cumulative:
            breakeven_year = year

    # Exit calculations
    exit_property_value = (
        inputs.total_property_value
        * (1 + inputs.annual_appreciation / 100) ** inputs.holding_period
    )
    capital_gains = exit_property_value - inputs.total_property_value

    # Private exit
    private_cg_tax = _calculate_private_exit_tax(
        capital_gains, inputs.holding_period, inputs.personal_marginal_tax_rate
    )
    private_net_exit = exit_property_value - private_cg_tax
    private_total_wealth = private_cumulative + private_net_exit

    # GmbH exit — corporate-level CG tax, then distribute remaining to shareholder
    gmbh_cg_tax = _calculate_gmbh_exit_tax(capital_gains, inputs.gewerbesteuer_hebesatz)
    gmbh_net_after_corp_cg = exit_property_value - gmbh_cg_tax
    # Distribution tax on liquidation gain (proceeds above original investment)
    distribution_gain = gmbh_net_after_corp_cg - inputs.total_property_value
    gmbh_distribution_tax = (
        distribution_gain * DISTRIBUTION_TAX_RATE if distribution_gain > 0 else 0.0
    )
    gmbh_net_exit = gmbh_net_after_corp_cg - gmbh_distribution_tax
    gmbh_total_wealth = gmbh_cumulative + gmbh_net_exit

    gmbh_advantage = gmbh_total_wealth - private_total_wealth

    # Recommendation
    if gmbh_advantage > 0:
        recommendation = "GmbH structure is more tax-efficient for your scenario"
    elif gmbh_advantage < 0:
        recommendation = "Private ownership is more tax-efficient for your scenario"
    else:
        recommendation = "Both structures yield similar results"

    return {
        "private": {
            "effective_tax_rate": round(private_tax_rate, 4),
            "year1_tax": round(private_projections[0]["tax"], 2),
            "year1_net_income": round(
                private_projections[0]["net_income_after_tax"], 2
            ),
            "total_net_rental_income": round(private_cumulative, 2),
            "exit_property_value": round(exit_property_value, 2),
            "capital_gains": round(capital_gains, 2),
            "capital_gains_tax": round(private_cg_tax, 2),
            "net_exit_proceeds": round(private_net_exit, 2),
            "total_wealth": round(private_total_wealth, 2),
            "projections": private_projections,
        },
        "gmbh": {
            "effective_tax_rate": round(gmbh_tax_rate, 4),
            "year1_tax": round(gmbh_projections[0]["tax"], 2),
            "year1_net_income": round(gmbh_projections[0]["net_income_after_tax"], 2),
            "total_net_rental_income": round(gmbh_cumulative, 2),
            "exit_property_value": round(exit_property_value, 2),
            "capital_gains": round(capital_gains, 2),
            "capital_gains_tax": round(gmbh_cg_tax, 2),
            "net_exit_proceeds": round(gmbh_net_exit, 2),
            "total_wealth": round(gmbh_total_wealth, 2),
            "projections": gmbh_projections,
        },
        "breakeven_year": breakeven_year,
        "gmbh_advantage_at_exit": round(gmbh_advantage, 2),
        "recommendation": recommendation,
    }


# ---------------------------------------------------------------------------
# CRUD operations
# ---------------------------------------------------------------------------


def save_comparison(
    session: Session,
    user_id: uuid.UUID,
    inputs: OwnershipComparisonRequest,
) -> OwnershipComparison:
    """Calculate, generate share_id, and persist.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.
        inputs: Validated comparison inputs.

    Returns:
        Persisted OwnershipComparison model.
    """
    results = calculate_comparison(inputs)

    comparison = OwnershipComparison(
        user_id=user_id,
        name=inputs.name,
        share_id=secrets.token_urlsafe(8),
        # Frozen inputs
        num_properties=inputs.num_properties,
        annual_rental_income=inputs.annual_rental_income,
        personal_marginal_tax_rate=inputs.personal_marginal_tax_rate,
        annual_appreciation=inputs.annual_appreciation,
        holding_period=inputs.holding_period,
        total_property_value=inputs.total_property_value,
        building_share_percent=inputs.building_share_percent,
        afa_rate_percent=inputs.afa_rate_percent,
        annual_rent_increase_percent=inputs.annual_rent_increase_percent,
        gewerbesteuer_hebesatz=inputs.gewerbesteuer_hebesatz,
        gmbh_setup_cost=inputs.gmbh_setup_cost,
        annual_accounting_cost=inputs.annual_accounting_cost,
        # Key results
        private_total_wealth=results["private"]["total_wealth"],
        gmbh_total_wealth=results["gmbh"]["total_wealth"],
        breakeven_year=results["breakeven_year"],
        gmbh_advantage_at_exit=results["gmbh_advantage_at_exit"],
        recommendation=results["recommendation"],
        # Full results as JSON
        results=results,
    )
    session.add(comparison)
    session.commit()
    session.refresh(comparison)
    return comparison


def get_comparison(
    session: Session,
    calc_id: uuid.UUID,
    user_id: uuid.UUID,
) -> OwnershipComparison:
    """Get a comparison by ID with ownership check.

    Args:
        session: Sync database session.
        calc_id: Comparison UUID.
        user_id: Authenticated user's UUID.

    Returns:
        OwnershipComparison model.

    Raises:
        HTTPException: If not found or not owned by user.
    """
    comparison = session.get(OwnershipComparison, calc_id)
    if not comparison or comparison.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ownership comparison not found",
        )
    return comparison


def get_by_share_id(session: Session, share_id: str) -> OwnershipComparison:
    """Get a comparison by share_id (no auth required).

    Args:
        session: Sync database session.
        share_id: Short URL-safe share identifier.

    Returns:
        OwnershipComparison model.

    Raises:
        HTTPException: If not found.
    """
    statement = select(OwnershipComparison).where(
        OwnershipComparison.share_id == share_id
    )
    comparison = session.exec(statement).first()
    if not comparison:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared ownership comparison not found",
        )
    return comparison


def list_user_comparisons(
    session: Session,
    user_id: uuid.UUID,
) -> list[OwnershipComparison]:
    """Get all saved comparisons for a user, newest first.

    Args:
        session: Sync database session.
        user_id: Authenticated user's UUID.

    Returns:
        List of OwnershipComparison models.
    """
    statement = (
        select(OwnershipComparison)
        .where(OwnershipComparison.user_id == user_id)
        .order_by(OwnershipComparison.created_at.desc())
    )
    return list(session.exec(statement).all())


def delete_comparison(
    session: Session,
    calc_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Delete a comparison with ownership check.

    Args:
        session: Sync database session.
        calc_id: Comparison UUID.
        user_id: Authenticated user's UUID.

    Raises:
        HTTPException: If not found or not owned by user.
    """
    comparison = get_comparison(session, calc_id, user_id)
    session.delete(comparison)
    session.commit()
