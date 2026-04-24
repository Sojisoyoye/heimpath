"""Contract analysis database model."""

from sqlalchemy import Column, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ContractAnalysis(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Stores an AI-generated clause-by-clause analysis of a German purchase contract."""

    __tablename__ = "contract_analysis"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename = Column(String(255), nullable=False)
    share_id = Column(String(12), unique=True, index=True, nullable=True)

    # Analysis results stored as JSON
    summary = Column(Text, nullable=True)
    analyzed_clauses = Column(JSON, nullable=True)
    notary_checklist = Column(JSON, nullable=True)
    overall_risk_assessment = Column(String(10), nullable=True)
    overall_risk_explanation = Column(Text, nullable=True)

    # Extracted financial data
    purchase_price = Column(Float, nullable=True)

    # Relationships
    user = relationship("User", back_populates="contract_analyses")
