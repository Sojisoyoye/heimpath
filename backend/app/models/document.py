"""Document translation database models."""

from enum import Enum as PyEnum

from sqlalchemy import (
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


class DocumentType(str, PyEnum):
    """Types of German real estate documents."""

    KAUFVERTRAG = "kaufvertrag"
    MIETVERTRAG = "mietvertrag"
    EXPOSE = "expose"
    NEBENKOSTENABRECHNUNG = "nebenkostenabrechnung"
    GRUNDBUCHAUSZUG = "grundbuchauszug"
    TEILUNGSERKLAERUNG = "teilungserklaerung"
    HAUSGELDABRECHNUNG = "hausgeldabrechnung"
    UNKNOWN = "unknown"


class DocumentStatus(str, PyEnum):
    """Processing status for uploaded documents."""

    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# PostgreSQL enum definitions (created by migration)
_document_type_enum = PgEnum(
    "kaufvertrag",
    "mietvertrag",
    "expose",
    "nebenkostenabrechnung",
    "grundbuchauszug",
    "teilungserklaerung",
    "hausgeldabrechnung",
    "unknown",
    name="documenttype",
    create_type=False,
)
_document_status_enum = PgEnum(
    "uploaded",
    "processing",
    "completed",
    "failed",
    name="documentstatus",
    create_type=False,
)


class Document(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Document database model.

    Represents an uploaded German real estate document for translation.
    """

    __tablename__ = "document"

    # Owner
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # File metadata
    original_filename = Column(String(500), nullable=False)
    stored_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    page_count = Column(Integer, nullable=False, default=0)

    # Classification
    document_type = Column(
        _document_type_enum, nullable=False, default=DocumentType.UNKNOWN.value
    )

    # Processing state
    status = Column(
        _document_status_enum, nullable=False, default=DocumentStatus.UPLOADED.value
    )
    error_message = Column(Text, nullable=True)

    # Relationships
    translation = relationship(
        "DocumentTranslation",
        back_populates="document",
        uselist=False,
        cascade="all, delete-orphan",
    )


class DocumentTranslation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Document translation database model.

    Stores translated content, detected clauses, and risk warnings
    for a processed document.
    """

    __tablename__ = "document_translation"

    # Foreign key to document (one-to-one)
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("document.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Translation metadata
    source_language = Column(String(10), nullable=False, default="de")
    target_language = Column(String(10), nullable=False, default="en")

    # Translation content (JSON)
    translated_pages = Column(JSONB, nullable=False, default=list)
    clauses_detected = Column(JSONB, nullable=False, default=list)
    risk_warnings = Column(JSONB, nullable=False, default=list)

    # Timing
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    document = relationship("Document", back_populates="translation")
