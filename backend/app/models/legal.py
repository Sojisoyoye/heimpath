"""Legal Knowledge Base database models."""

from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class LawCategory(str, PyEnum):
    """Categories for German real estate laws."""

    BUYING_PROCESS = "buying_process"
    COSTS_AND_TAXES = "costs_and_taxes"
    RENTAL_LAW = "rental_law"
    CONDOMINIUM = "condominium"
    AGENT_REGULATIONS = "agent_regulations"


class PropertyTypeApplicability(str, PyEnum):
    """Property types a law applies to."""

    ALL = "all"
    APARTMENT = "apartment"
    HOUSE = "house"
    LAND = "land"
    COMMERCIAL = "commercial"


# PostgreSQL enum definitions (created by migration)
_law_category_enum = PgEnum(
    "buying_process",
    "costs_and_taxes",
    "rental_law",
    "condominium",
    "agent_regulations",
    name="lawcategory",
    create_type=False,
)
_property_applicability_enum = PgEnum(
    "all",
    "apartment",
    "house",
    "land",
    "commercial",
    name="propertyapplicability",
    create_type=False,
)


class Law(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Law database model.

    Represents a German real estate law with translations and explanations.
    """

    __tablename__ = "law"

    # Core identifiers
    citation = Column(
        String(100), nullable=False, unique=True, index=True
    )  # e.g., "§ 433 BGB"
    title_de = Column(String(500), nullable=False)  # Original German title
    title_en = Column(String(500), nullable=False)  # English translation

    # Category and applicability
    category = Column(_law_category_enum, nullable=False, index=True)
    property_type = Column(
        _property_applicability_enum,
        default=PropertyTypeApplicability.ALL.value,
        nullable=False,
    )

    # Summaries
    one_line_summary = Column(String(280), nullable=False)  # Twitter-length summary
    short_summary = Column(Text, nullable=False)  # 2-3 sentences
    detailed_explanation = Column(Text, nullable=False)  # 2-3 paragraphs

    # Practical guidance
    real_world_example = Column(Text, nullable=True)
    common_disputes = Column(Text, nullable=True)  # Common disputes and resolutions
    buyer_implications = Column(Text, nullable=True)  # What it means for buyer
    seller_implications = Column(Text, nullable=True)  # What it means for seller
    landlord_implications = Column(Text, nullable=True)  # What it means for landlord
    tenant_implications = Column(Text, nullable=True)  # What it means for tenant

    # Original text and amendments
    original_text_de = Column(Text, nullable=True)  # Full German text (collapsible)
    last_amended = Column(DateTime(timezone=True), nullable=True)
    change_history = Column(Text, nullable=True)  # JSON array of changes

    # Search optimization
    search_vector = Column(TSVECTOR)  # Full-text search vector

    # Relationships
    court_rulings = relationship(
        "CourtRuling",
        back_populates="law",
        cascade="all, delete-orphan",
    )
    state_variations = relationship(
        "StateVariation",
        back_populates="law",
        cascade="all, delete-orphan",
    )
    bookmarks = relationship(
        "LawBookmark",
        back_populates="law",
        cascade="all, delete-orphan",
    )
    journey_step_links = relationship(
        "LawJourneyStepLink",
        back_populates="law",
        cascade="all, delete-orphan",
    )

    # Index for full-text search
    __table_args__ = (
        Index("ix_law_search_vector", "search_vector", postgresql_using="gin"),
    )


class RelatedLaw(Base):
    """
    Related law association table.

    Links laws that are related to each other.
    """

    __tablename__ = "related_law"

    law_id = Column(
        UUID(as_uuid=True),
        ForeignKey("law.id", ondelete="CASCADE"),
        primary_key=True,
    )
    related_law_id = Column(
        UUID(as_uuid=True),
        ForeignKey("law.id", ondelete="CASCADE"),
        primary_key=True,
    )
    relationship_type = Column(
        String(50), nullable=True
    )  # e.g., "supplements", "modifies", "supersedes"


class CourtRuling(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Court ruling database model.

    Represents a court decision related to a law.
    """

    __tablename__ = "court_ruling"

    # Foreign key to law
    law_id = Column(
        UUID(as_uuid=True),
        ForeignKey("law.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Ruling details
    court_name = Column(String(200), nullable=False)  # e.g., "Bundesgerichtshof (BGH)"
    case_number = Column(String(100), nullable=False)  # e.g., "V ZR 123/19"
    ruling_date = Column(DateTime(timezone=True), nullable=False)
    title = Column(String(500), nullable=False)
    summary = Column(Text, nullable=False)
    significance = Column(Text, nullable=True)  # Why this ruling matters
    source_url = Column(String(500), nullable=True)  # Link to official source

    # Relationship
    law = relationship("Law", back_populates="court_rulings")


class StateVariation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    State variation database model.

    Represents state-specific variations of a law (e.g., different tax rates).
    """

    __tablename__ = "state_variation"

    # Foreign key to law
    law_id = Column(
        UUID(as_uuid=True),
        ForeignKey("law.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # State details
    state_code = Column(
        String(2), nullable=False
    )  # German state code (e.g., "BY" for Bavaria)
    state_name = Column(String(100), nullable=False)  # Full state name

    # Variation content
    variation_title = Column(String(255), nullable=False)  # What varies
    variation_value = Column(String(100), nullable=True)  # e.g., "3.5%" for tax rate
    variation_description = Column(Text, nullable=False)  # Explanation of variation
    effective_date = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    law = relationship("Law", back_populates="state_variations")

    # Unique constraint on law + state
    __table_args__ = (
        Index("ix_state_variation_law_state", "law_id", "state_code", unique=True),
    )


class LawBookmark(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Law bookmark database model.

    Allows users to bookmark laws for later reference.
    """

    __tablename__ = "law_bookmark"

    # Foreign keys
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    law_id = Column(
        UUID(as_uuid=True),
        ForeignKey("law.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Optional notes
    notes = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", backref="law_bookmarks")
    law = relationship("Law", back_populates="bookmarks")

    # Unique constraint on user + law
    __table_args__ = (
        Index("ix_law_bookmark_user_law", "user_id", "law_id", unique=True),
    )


class LawJourneyStepLink(Base):
    """
    Link between laws and journey steps.

    Allows laws to be automatically surfaced at relevant journey steps.
    """

    __tablename__ = "law_journey_step_link"

    law_id = Column(
        UUID(as_uuid=True),
        ForeignKey("law.id", ondelete="CASCADE"),
        primary_key=True,
    )
    step_content_key = Column(
        String(100),
        nullable=False,
        primary_key=True,
    )
    relevance_score = Column(
        Integer, default=50, nullable=False
    )  # 0-100, higher = more relevant

    # Relationship
    law = relationship("Law", back_populates="journey_step_links")


class LawVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Law version history.

    Tracks changes to law content over time.
    """

    __tablename__ = "law_version"

    # Foreign key to law
    law_id = Column(
        UUID(as_uuid=True),
        ForeignKey("law.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Version metadata
    version_number = Column(Integer, nullable=False)
    changed_by = Column(String(255), nullable=True)  # Who made the change
    change_reason = Column(Text, nullable=True)  # Why the change was made

    # Snapshot of content at this version
    content_snapshot = Column(Text, nullable=False)  # JSON snapshot of law fields
