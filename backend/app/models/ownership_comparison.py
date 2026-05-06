"""Ownership comparison (GmbH vs. Private) database model."""

from sqlalchemy import Column, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class OwnershipComparison(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Ownership comparison database model.

    Stores frozen calculation inputs, key results, and full year-by-year
    projections for saved GmbH vs. private ownership comparisons.
    """

    __tablename__ = "ownership_comparison"

    # Owner
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Optional custom name
    name = Column(String(255), nullable=True)

    # Shareable link identifier
    share_id = Column(String(12), unique=True, index=True, nullable=True)

    # Frozen inputs
    num_properties = Column(Integer, nullable=False)
    annual_rental_income = Column(Float, nullable=False)
    personal_marginal_tax_rate = Column(Float, nullable=False)
    annual_appreciation = Column(Float, nullable=False)
    holding_period = Column(Integer, nullable=False)
    total_property_value = Column(Float, nullable=False)
    building_share_percent = Column(Float, nullable=False)
    afa_rate_percent = Column(Float, nullable=False)
    annual_rent_increase_percent = Column(Float, nullable=False)
    gewerbesteuer_hebesatz = Column(Float, nullable=False)
    gmbh_setup_cost = Column(Float, nullable=False)
    annual_accounting_cost = Column(Float, nullable=False)

    # Key results (frozen at save time)
    private_total_wealth = Column(Float, nullable=False)
    gmbh_total_wealth = Column(Float, nullable=False)
    breakeven_year = Column(Integer, nullable=True)
    gmbh_advantage_at_exit = Column(Float, nullable=False)
    recommendation = Column(String(255), nullable=False)

    # Full results stored as JSON
    results = Column(JSON, nullable=False)
