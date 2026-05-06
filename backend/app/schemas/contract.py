"""Contract explainer API schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

_SHARED_UPGRADE_CTA = "Sign up to see the full analysis — all clauses, notary checklist, and risk assessment."

# Must match contract_service.FREE_TIER_CLAUSE_LIMIT — kept here to avoid a
# circular import between schemas and services.
_SHARED_PREVIEW_CLAUSE_LIMIT = 3


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
    purchase_price: float | None = None
    clause_count: int
    is_truncated: bool
    created_at: datetime


class ContractSharedPreviewResponse(BaseModel):
    """Limited response for unauthenticated shared contract previews.

    Exposes at most 3 clauses and the overall risk level to encourage
    sign-up, without giving away the full premium analysis.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    share_id: str | None
    summary: str | None
    analyzed_clauses: list[ClauseExplanation]  # max 3
    overall_risk_assessment: str | None
    clause_count: int
    is_truncated: bool
    requires_subscription: bool
    upgrade_cta: str
    created_at: datetime

    @classmethod
    def from_full_response(
        cls, r: "ContractAnalysisResponse"
    ) -> "ContractSharedPreviewResponse":
        preview_clauses = (r.analyzed_clauses or [])[:_SHARED_PREVIEW_CLAUSE_LIMIT]
        return cls(
            id=r.id,
            filename=r.filename,
            share_id=r.share_id,
            summary=r.summary,
            analyzed_clauses=preview_clauses,
            overall_risk_assessment=r.overall_risk_assessment,
            clause_count=r.clause_count,
            is_truncated=r.clause_count > _SHARED_PREVIEW_CLAUSE_LIMIT,
            requires_subscription=True,
            upgrade_cta=_SHARED_UPGRADE_CTA,
            created_at=r.created_at,
        )


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
