"""Financing eligibility assessment database model."""

from sqlalchemy import Column, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FinancingAssessment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Financing eligibility assessment database model.

    Stores frozen assessment inputs, score breakdown, likelihood label,
    loan estimates, and advisory lists for saved financing assessments.
    """

    __tablename__ = "financing_assessment"

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
    employment_status = Column(String(50), nullable=False)
    employment_years = Column(Integer, nullable=False)
    monthly_net_income = Column(Float, nullable=False)
    monthly_debt = Column(Float, nullable=False)
    available_down_payment = Column(Float, nullable=False)
    schufa_rating = Column(String(20), nullable=False)
    residency_status = Column(String(30), nullable=False)

    # Score breakdown (each factor's contribution)
    employment_score = Column(Float, nullable=False)
    income_ratio_score = Column(Float, nullable=False)
    down_payment_score = Column(Float, nullable=False)
    schufa_score = Column(Float, nullable=False)
    residency_score = Column(Float, nullable=False)
    years_bonus_score = Column(Float, nullable=False)

    # Results
    total_score = Column(Float, nullable=False)
    likelihood_label = Column(String(20), nullable=False)

    # Estimates
    max_loan_estimate = Column(Float, nullable=False)
    recommended_down_payment_percent = Column(Float, nullable=False)
    expected_rate_min = Column(Float, nullable=False)
    expected_rate_max = Column(Float, nullable=False)
    ltv_ratio = Column(Float, nullable=False)

    # Advisory JSON columns
    strengths = Column(JSON, nullable=False)
    improvements = Column(JSON, nullable=False)
    document_checklist = Column(JSON, nullable=False)
