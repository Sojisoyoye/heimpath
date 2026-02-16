"""Hidden cost calculation database model."""

from sqlalchemy import Boolean, Column, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class HiddenCostCalculation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Hidden cost calculation database model.

    Stores frozen calculation inputs and results for saved calculations.
    Results are stored at save time so they remain stable even if rates change.
    """

    __tablename__ = "hidden_cost_calculation"

    # Owner (nullable for share-only queries)
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

    # Inputs
    property_price = Column(Float, nullable=False)
    state_code = Column(String(2), nullable=False)
    property_type = Column(String(50), nullable=False)
    include_agent = Column(Boolean, nullable=False, default=True)
    renovation_level = Column(String(10), nullable=False, default="none")
    include_moving = Column(Boolean, nullable=False, default=True)

    # Results (frozen at save time)
    transfer_tax = Column(Float, nullable=False)
    notary_fee = Column(Float, nullable=False)
    land_registry_fee = Column(Float, nullable=False)
    agent_commission = Column(Float, nullable=False)
    renovation_estimate = Column(Float, nullable=False)
    moving_costs = Column(Float, nullable=False)
    total_additional_costs = Column(Float, nullable=False)
    total_cost_of_ownership = Column(Float, nullable=False)
    additional_cost_percentage = Column(Float, nullable=False)
