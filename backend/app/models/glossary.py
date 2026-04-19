"""Glossary database models for German real estate terminology."""

from enum import Enum as PyEnum

from sqlalchemy import Column, Index, String, Text
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class GlossaryCategory(str, PyEnum):
    """Categories for German real estate glossary terms."""

    BUYING_PROCESS = "buying_process"
    COSTS_TAXES = "costs_taxes"
    FINANCING = "financing"
    LEGAL = "legal"
    RENTAL = "rental"
    PROPERTY_TYPES = "property_types"


# PostgreSQL enum definition (created by migration)
_glossary_category_enum = PgEnum(
    "buying_process",
    "costs_taxes",
    "financing",
    "legal",
    "rental",
    "property_types",
    name="glossarycategory",
    create_type=False,
)


class GlossaryTerm(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Glossary term database model.

    Represents a German real estate term with English translation and explanation.
    """

    __tablename__ = "glossary_term"

    # Core fields
    term_de = Column(String(200), nullable=False, unique=True, index=True)
    term_en = Column(String(200), nullable=False)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    definition_short = Column(String(300), nullable=False)
    definition_long = Column(Text, nullable=False)
    category = Column(_glossary_category_enum, nullable=False, index=True)

    # Optional fields
    example_usage = Column(Text, nullable=True)
    related_terms = Column(JSONB, nullable=True, default=list)

    # Search optimization
    search_vector = Column(TSVECTOR)

    # Full-text search index
    __table_args__ = (
        Index(
            "ix_glossary_term_search_vector",
            "search_vector",
            postgresql_using="gin",
        ),
    )
