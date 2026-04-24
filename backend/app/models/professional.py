"""Professional network directory database models."""

from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ProfessionalType(str, PyEnum):
    """Types of professionals in the directory."""

    LAWYER = "lawyer"
    NOTARY = "notary"
    TAX_ADVISOR = "tax_advisor"
    MORTGAGE_BROKER = "mortgage_broker"
    REAL_ESTATE_AGENT = "real_estate_agent"


class ServiceType(str, PyEnum):
    """Types of services a professional can provide."""

    BUYING = "buying"
    SELLING = "selling"
    RENTAL = "rental"
    TAX = "tax"
    LEGAL = "legal"


# PostgreSQL enum definitions (created by migration)
_professional_type_enum = PgEnum(
    "lawyer",
    "notary",
    "tax_advisor",
    "mortgage_broker",
    "real_estate_agent",
    name="professionaltype",
    create_type=False,
)

_service_type_enum = PgEnum(
    "buying",
    "selling",
    "rental",
    "tax",
    "legal",
    name="servicetype",
    create_type=False,
)


class Professional(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Professional directory listing."""

    __tablename__ = "professional"

    name = Column(String(255), nullable=False)
    type = Column(_professional_type_enum, nullable=False, index=True)
    city = Column(String(255), nullable=False, index=True)
    languages = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(500), nullable=True)
    is_verified = Column(Boolean, nullable=False, default=True)
    average_rating = Column(Float, nullable=False, default=0.0)
    review_count = Column(Integer, nullable=False, default=0)
    recommendation_rate = Column(Float, nullable=True)
    review_highlights = Column(JSON, nullable=True)

    click_count = Column(Integer, nullable=False, default=0)

    # Relationships
    reviews = relationship(
        "ProfessionalReview",
        back_populates="professional",
        cascade="all, delete-orphan",
    )
    inquiries = relationship(
        "ContactInquiry",
        back_populates="professional",
        cascade="all, delete-orphan",
    )


class ProfessionalReview(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """User review for a professional."""

    __tablename__ = "professional_review"

    professional_id = Column(
        UUID(as_uuid=True),
        ForeignKey("professional.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    service_used = Column(_service_type_enum, nullable=True)
    language_used = Column(String(100), nullable=True)
    would_recommend = Column(Boolean, nullable=True)
    response_time_rating = Column(Integer, nullable=True)

    # Relationships
    professional = relationship("Professional", back_populates="reviews")

    __table_args__ = (
        UniqueConstraint(
            "professional_id", "user_id", name="uq_professional_review_user"
        ),
    )


class ContactInquiry(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Contact inquiry submitted by a user to a professional."""

    __tablename__ = "contact_inquiry"

    professional_id = Column(
        UUID(as_uuid=True),
        ForeignKey("professional.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_name = Column(String(255), nullable=False)
    sender_email = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    # "pending" | "sent" | "failed"
    status = Column(String(20), nullable=False, default="pending")
    sent_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    professional = relationship("Professional", back_populates="inquiries")
