"""ROI calculation database model."""

from sqlalchemy import Column, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ROICalculation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    ROI calculation database model.

    Stores frozen calculation inputs, results, investment grade,
    and 10-year projections for saved ROI calculations.
    """

    __tablename__ = "roi_calculation"

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
    purchase_price = Column(Float, nullable=False)
    down_payment = Column(Float, nullable=False)
    monthly_rent = Column(Float, nullable=False)
    monthly_expenses = Column(Float, nullable=False)
    annual_appreciation = Column(Float, nullable=False)
    vacancy_rate = Column(Float, nullable=False)
    mortgage_rate = Column(Float, nullable=False)
    mortgage_term = Column(Integer, nullable=False)

    # Results (frozen at save time)
    gross_rental_income = Column(Float, nullable=False)
    net_operating_income = Column(Float, nullable=False)
    annual_cash_flow = Column(Float, nullable=False)
    monthly_mortgage_payment = Column(Float, nullable=False)
    gross_yield = Column(Float, nullable=False)
    net_yield = Column(Float, nullable=False)
    cap_rate = Column(Float, nullable=False)
    cash_on_cash_return = Column(Float, nullable=False)
    investment_grade = Column(Float, nullable=False)
    investment_grade_label = Column(String(20), nullable=False)

    # 10-year projections stored as JSON array
    projections = Column(JSON, nullable=False)
