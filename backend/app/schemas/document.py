"""Document translation request/response schemas."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class DocumentTypeEnum(str, Enum):
    """Document type choices."""

    KAUFVERTRAG = "kaufvertrag"
    MIETVERTRAG = "mietvertrag"
    EXPOSE = "expose"
    NEBENKOSTENABRECHNUNG = "nebenkostenabrechnung"
    GRUNDBUCHAUSZUG = "grundbuchauszug"
    TEILUNGSERKLAERUNG = "teilungserklaerung"
    HAUSGELDABRECHNUNG = "hausgeldabrechnung"
    UNKNOWN = "unknown"


class DocumentStatusEnum(str, Enum):
    """Document processing status choices."""

    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentUploadResponse(BaseModel):
    """Response after uploading a document."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    original_filename: str
    file_size_bytes: int
    page_count: int
    document_type: DocumentTypeEnum
    status: DocumentStatusEnum


class DocumentSummary(BaseModel):
    """Summary of a document for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    original_filename: str
    file_size_bytes: int
    page_count: int
    document_type: DocumentTypeEnum
    status: DocumentStatusEnum
    created_at: datetime


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""

    data: list[DocumentSummary]
    total: int
    page: int
    page_size: int


class TranslatedPage(BaseModel):
    """A single page of translated content."""

    page_number: int
    original_text: str
    translated_text: str


class DetectedClause(BaseModel):
    """A legal clause detected in the document."""

    clause_type: str = Field(
        ...,
        description="Type: purchase_price, deadline, warranty_exclusion, special_condition, financial_term",
    )
    original_text: str
    translated_text: str
    page_number: int
    risk_level: str = Field(..., description="Risk level: low, medium, high")


class DocumentRiskWarning(BaseModel):
    """Risk warning for a term in the document."""

    original_term: str
    translated_term: str
    risk_level: str
    explanation: str
    page_number: int | None = None


class DocumentTranslationResponse(BaseModel):
    """Full translation result for a document."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    source_language: str
    target_language: str
    translated_pages: list[TranslatedPage]
    clauses_detected: list[DetectedClause]
    risk_warnings: list[DocumentRiskWarning]
    processing_started_at: datetime | None = None
    processing_completed_at: datetime | None = None


class DocumentDetailResponse(BaseModel):
    """Full document detail with optional translation."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    original_filename: str
    file_size_bytes: int
    page_count: int
    document_type: DocumentTypeEnum
    status: DocumentStatusEnum
    error_message: str | None = None
    created_at: datetime
    translation: DocumentTranslationResponse | None = None


class DocumentStatusResponse(BaseModel):
    """Lightweight status check response."""

    id: str
    status: DocumentStatusEnum
    error_message: str | None = None
    page_count: int
