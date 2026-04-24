"""Contract explainer API schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ClauseExplanation(BaseModel):
    """A single analyzed clause from a Kaufvertrag."""

    model_config = ConfigDict(from_attributes=True)

    section_name: str
    section_name_en: str
    original_text: str
    plain_english_explanation: str
    risk_level: Literal["low", "medium", "high"]
    risk_reason: str
    is_unusual: bool
    unusual_terms: list[str]
    page_number: int | None = None


class NotaryQuestion(BaseModel):
    """A question to ask the notary."""

    question: str
    related_clause: str
    priority: Literal["essential", "recommended", "optional"]


class ContractAnalysisResponse(BaseModel):
    """Full response for a contract analysis."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    share_id: str | None
    summary: str | None
    analyzed_clauses: list[ClauseExplanation] | None
    notary_checklist: list[NotaryQuestion] | None
    overall_risk_assessment: str | None
    overall_risk_explanation: str | None
    clause_count: int
    is_truncated: bool
    created_at: datetime


class ContractAnalysisListItem(BaseModel):
    """Summary item for listing analyses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    share_id: str | None
    overall_risk_assessment: str | None
    clause_count: int
    created_at: datetime


class ContractAnalysisListResponse(BaseModel):
    """Paginated list of contract analyses."""

    data: list[ContractAnalysisListItem]
    total: int
    page: int
    page_size: int
