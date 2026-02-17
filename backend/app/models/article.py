"""Content Library article database models."""

from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ArticleCategory(str, PyEnum):
    """Categories for content library articles."""

    BUYING_PROCESS = "buying_process"
    COSTS_AND_TAXES = "costs_and_taxes"
    REGULATIONS = "regulations"
    COMMON_PITFALLS = "common_pitfalls"


class ArticleStatus(str, PyEnum):
    """Publication status for articles."""

    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class DifficultyLevel(str, PyEnum):
    """Difficulty level for articles."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


# PostgreSQL enum definitions (created by migration)
_article_category_enum = PgEnum(
    "buying_process",
    "costs_and_taxes",
    "regulations",
    "common_pitfalls",
    name="articlecategory",
    create_type=False,
)
_article_status_enum = PgEnum(
    "draft",
    "published",
    "archived",
    name="articlestatus",
    create_type=False,
)
_difficulty_level_enum = PgEnum(
    "beginner",
    "intermediate",
    "advanced",
    name="difficultylevel",
    create_type=False,
)


class Article(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Article database model.

    Represents a content library article with SEO metadata and full-text search.
    """

    __tablename__ = "article"

    # Core fields
    slug = Column(String(255), nullable=False, unique=True, index=True)
    title = Column(String(500), nullable=False)
    meta_description = Column(String(320), nullable=False)
    category = Column(_article_category_enum, nullable=False, index=True)
    difficulty_level = Column(_difficulty_level_enum, nullable=False)
    status = Column(
        _article_status_enum,
        default=ArticleStatus.DRAFT.value,
        nullable=False,
        index=True,
    )

    # Content
    excerpt = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    key_takeaways = Column(JSONB, nullable=False, default=list)

    # Metadata
    reading_time_minutes = Column(Integer, nullable=False, default=1)
    view_count = Column(Integer, nullable=False, default=0)
    author_name = Column(String(255), nullable=False)

    # Related resources (stored as JSONB)
    related_law_ids = Column(JSONB, nullable=True, default=list)
    related_calculator_types = Column(JSONB, nullable=True, default=list)

    # Full-text search
    search_vector = Column(TSVECTOR)

    # Relationships
    ratings = relationship(
        "ArticleRating",
        back_populates="article",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "ix_article_search_vector",
            "search_vector",
            postgresql_using="gin",
        ),
    )


class ArticleRating(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Article rating database model.

    Tracks per-user helpfulness ratings for articles.
    """

    __tablename__ = "article_rating"

    article_id = Column(
        UUID(as_uuid=True),
        ForeignKey("article.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_helpful = Column(Boolean, nullable=False)

    # Relationships
    article = relationship("Article", back_populates="ratings")

    __table_args__ = (
        UniqueConstraint("article_id", "user_id", name="uq_article_rating_user"),
    )
