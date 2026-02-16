"""Journey database models for the guided property buying process."""

from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class JourneyPhase(str, PyEnum):
    """Phases of the property buying journey."""

    RESEARCH = "research"
    PREPARATION = "preparation"
    BUYING = "buying"
    CLOSING = "closing"


class StepStatus(str, PyEnum):
    """Status of a journey step."""

    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class PropertyType(str, PyEnum):
    """Types of properties."""

    APARTMENT = "apartment"
    HOUSE = "house"
    LAND = "land"
    COMMERCIAL = "commercial"


class FinancingType(str, PyEnum):
    """Types of financing."""

    CASH = "cash"
    MORTGAGE = "mortgage"
    MIXED = "mixed"


# Define PostgreSQL enum types with create_type=False to prevent auto-creation
# These will be created by Alembic migration
_journey_phase_enum = PgEnum(
    "research",
    "preparation",
    "buying",
    "closing",
    name="journeyphase",
    create_type=False,
)
_step_status_enum = PgEnum(
    "not_started",
    "in_progress",
    "completed",
    "skipped",
    name="stepstatus",
    create_type=False,
)
_property_type_enum = PgEnum(
    "apartment", "house", "land", "commercial", name="propertytype", create_type=False
)
_financing_type_enum = PgEnum(
    "cash", "mortgage", "mixed", name="financingtype", create_type=False
)


class Journey(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Journey database model.

    Represents a user's property buying journey with personalized steps
    based on their questionnaire answers.
    """

    __tablename__ = "journey"

    # Foreign key to user
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Journey metadata
    title = Column(String(255), nullable=False, default="My Property Journey")
    current_phase = Column(
        _journey_phase_enum,
        default=JourneyPhase.RESEARCH.value,
        nullable=False,
    )
    current_step_number = Column(Integer, default=1, nullable=False)

    # Questionnaire answers (personalization data)
    property_type = Column(_property_type_enum, nullable=True)
    property_location = Column(String(255), nullable=True)  # German state/city
    financing_type = Column(_financing_type_enum, nullable=True)
    is_first_time_buyer = Column(Boolean, default=True, nullable=False)
    has_german_residency = Column(Boolean, default=False, nullable=False)
    budget_euros = Column(Integer, nullable=True)
    target_purchase_date = Column(DateTime(timezone=True), nullable=True)

    # Property goals (Step 1 user input)
    property_goals = Column(JSONB, nullable=True)

    # Progress tracking
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", backref="journeys")
    steps = relationship(
        "JourneyStep",
        back_populates="journey",
        cascade="all, delete-orphan",
        order_by="JourneyStep.step_number",
    )


class JourneyStep(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Journey step database model.

    Represents an individual step in a user's property buying journey.
    """

    __tablename__ = "journey_step"

    # Foreign key to journey
    journey_id = Column(
        UUID(as_uuid=True),
        ForeignKey("journey.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Step metadata
    step_number = Column(Integer, nullable=False)
    phase = Column(_journey_phase_enum, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    estimated_duration_days = Column(Integer, nullable=True)

    # Status tracking
    status = Column(
        _step_status_enum,
        default=StepStatus.NOT_STARTED.value,
        nullable=False,
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Content references
    content_key = Column(String(100), nullable=True)  # Key to fetch related content
    related_laws = Column(Text, nullable=True)  # JSON array of related law references
    estimated_costs = Column(Text, nullable=True)  # JSON object with cost breakdown

    # Prerequisites (step numbers that must be completed first)
    prerequisites = Column(Text, nullable=True)  # JSON array of step numbers

    # Relationships
    journey = relationship("Journey", back_populates="steps")
    tasks = relationship(
        "JourneyTask",
        back_populates="step",
        cascade="all, delete-orphan",
        order_by="JourneyTask.order",
    )


class JourneyTask(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Journey task database model.

    Represents a checklist item within a journey step.
    """

    __tablename__ = "journey_task"

    # Foreign key to step
    step_id = Column(
        UUID(as_uuid=True),
        ForeignKey("journey_step.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Task metadata
    order = Column(Integer, nullable=False, default=0)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_required = Column(Boolean, default=True, nullable=False)

    # Status
    is_completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Optional link to external resource or document
    resource_url = Column(String(500), nullable=True)
    resource_type = Column(String(50), nullable=True)  # 'document', 'link', 'video'

    # Relationships
    step = relationship("JourneyStep", back_populates="tasks")
