"""Property evaluation database model."""

from sqlalchemy import Boolean, Column, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PropertyEvaluation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Property evaluation database model.

    Stores full evaluation inputs/results as JSON, with key summary
    fields denormalized as real columns for queries and summaries.
    """

    __tablename__ = "property_evaluation"

    # Ownership & sharing
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    journey_step_id = Column(
        UUID(as_uuid=True),
        ForeignKey("journey_step.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name = Column(String(255), nullable=True)
    share_id = Column(String(12), unique=True, index=True, nullable=True)

    # Key inputs (denormalized for queries/summaries)
    purchase_price = Column(Float, nullable=False)
    square_meters = Column(Float, nullable=False)
    state_code = Column(String(2), nullable=True)

    # Full inputs — JSON column storing PropertyEvaluationState
    inputs = Column(JSON, nullable=False)

    # Key results (denormalized for summaries)
    cashflow_after_tax = Column(Float, nullable=False)
    gross_rental_yield = Column(Float, nullable=False)
    return_on_equity = Column(Float, nullable=False)
    is_positive_cashflow = Column(Boolean, nullable=False)

    # Full results — JSON column storing EvaluationResults
    results = Column(JSON, nullable=False)
