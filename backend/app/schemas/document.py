"""Document translation request/response schemas."""

import uuid
from datetime import datetime
from enum import Enum
from typing import Literal

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
    WOHNUNGSGRUNDRISS = "wohnungsgrundriss"
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

    id: uuid.UUID
    original_filename: str
    file_size_bytes: int
    page_count: int
    document_type: DocumentTypeEnum
    status: DocumentStatusEnum
    journey_step_id: uuid.UUID | None = None


class DocumentSummary(BaseModel):
    """Summary of a document for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str
    file_size_bytes: int
    page_count: int
    document_type: DocumentTypeEnum
    status: DocumentStatusEnum
    share_id: str | None = None
    journey_step_id: uuid.UUID | None = None
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
    risk_reason: str = Field(
        default="",
        description="Plain-English explanation of why this risk level was assigned",
    )


class DocumentRiskWarning(BaseModel):
    """Risk warning for a term in the document."""

    original_term: str
    translated_term: str
    risk_level: str
    explanation: str
    page_number: int | None = None


class AnalyzedClause(BaseModel):
    """AI-analyzed clause from a Kaufvertrag."""

    section_name: str
    section_name_en: str
    original_text: str
    plain_english_explanation: str
    risk_level: Literal["low", "medium", "high"]
    risk_reason: str
    is_unusual: bool = False
    unusual_terms: list[str] = Field(default_factory=list)
    page_number: int | None = None


class NotaryQuestion(BaseModel):
    """Question to ask a notary about a contract clause."""

    question: str
    related_clause: str
    priority: Literal["essential", "recommended", "optional"]


class KaufvertragAnalysis(BaseModel):
    """Full AI analysis of a Kaufvertrag (purchase contract)."""

    summary: str
    analyzed_clauses: list[AnalyzedClause]
    notary_checklist: list[NotaryQuestion]
    overall_risk_assessment: Literal["low", "medium", "high"]
    overall_risk_explanation: str
    is_ai_generated: bool = True


class DocumentTranslationResponse(BaseModel):
    """Full translation result for a document."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    source_language: str
    target_language: str
    translated_pages: list[TranslatedPage]
    clauses_detected: list[DetectedClause]
    risk_warnings: list[DocumentRiskWarning]
    kaufvertrag_analysis: KaufvertragAnalysis | None = None
    type_analysis: dict | None = None
    processing_started_at: datetime | None = None
    processing_completed_at: datetime | None = None


class DocumentDetailResponse(BaseModel):
    """Full document detail with optional translation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str
    file_size_bytes: int
    page_count: int
    document_type: DocumentTypeEnum
    status: DocumentStatusEnum
    error_message: str | None = None
    share_id: str | None = None
    journey_step_id: uuid.UUID | None = None
    created_at: datetime
    translation: DocumentTranslationResponse | None = None


class DocumentShareResponse(BaseModel):
    """Response after generating a share link for a document."""

    id: uuid.UUID
    share_id: str


class DocumentUsageResponse(BaseModel):
    """Document usage limits for the current user."""

    documents_used: int
    page_limit: int
    subscription_tier: str


class DocumentStatusResponse(BaseModel):
    """Lightweight status check response."""

    id: uuid.UUID
    status: DocumentStatusEnum
    error_message: str | None = None
    page_count: int
