"""Contract explainer API endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app._models_sqlmodel import SubscriptionTier
from app.api.deps import CurrentUser, SessionDep
from app.models.contract import ContractAnalysis
from app.schemas.contract import (
    ClauseExplanation,
    ContractAnalysisListItem,
    ContractAnalysisListResponse,
    ContractAnalysisResponse,
    NotaryQuestion,
)
from app.services import contract_service
from app.services.document_service import _validate_pdf_bytes

router = APIRouter(prefix="/contracts", tags=["contracts"])

# Max upload size: 20 MB
_MAX_FILE_SIZE = 20 * 1024 * 1024

# Free tier sees only the first N clauses
_FREE_TIER_LIMIT = contract_service.FREE_TIER_CLAUSE_LIMIT


def _build_response(
    record: ContractAnalysis,
    is_premium: bool,
) -> ContractAnalysisResponse:
    """Build ContractAnalysisResponse, applying free-tier clause truncation."""
    all_clauses = record.analyzed_clauses or []
    all_checklist = record.notary_checklist or []

    def _to_clause(c: dict) -> ClauseExplanation | None:
        try:
            return ClauseExplanation.model_validate(c)
        except Exception:
            return None

    def _to_question(q: dict) -> NotaryQuestion | None:
        try:
            return NotaryQuestion.model_validate(q)
        except Exception:
            return None

    parsed_clauses = [c for c in (_to_clause(x) for x in all_clauses) if c]
    parsed_checklist = [q for q in (_to_question(x) for x in all_checklist) if q]

    if is_premium:
        visible_clauses = parsed_clauses
        visible_checklist = parsed_checklist
        is_truncated = False
    else:
        visible_clauses = parsed_clauses[:_FREE_TIER_LIMIT]
        visible_checklist = []
        is_truncated = len(parsed_clauses) > _FREE_TIER_LIMIT

    return ContractAnalysisResponse(
        id=record.id,
        filename=record.filename,
        share_id=record.share_id,
        summary=record.summary,
        analyzed_clauses=visible_clauses,
        notary_checklist=visible_checklist,
        overall_risk_assessment=record.overall_risk_assessment,
        overall_risk_explanation=record.overall_risk_explanation
        if is_premium
        else None,
        purchase_price=record.purchase_price,
        clause_count=len(all_clauses),
        is_truncated=is_truncated,
        created_at=record.created_at,
    )


# ---------------------------------------------------------------------------
# Public endpoints (no auth)
# ---------------------------------------------------------------------------


@router.get("/shared/{share_id}", response_model=ContractAnalysisResponse)
async def get_shared_analysis(
    share_id: str,
    session: SessionDep,
) -> ContractAnalysisResponse:
    """Retrieve a shared contract analysis by share_id (no auth required)."""
    try:
        record = contract_service.get_analysis_by_share_id(session, share_id)
    except contract_service.ContractAnalysisNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared analysis not found",
        )
    return _build_response(record, is_premium=True)


# ---------------------------------------------------------------------------
# Auth-required endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/analyze",
    status_code=status.HTTP_201_CREATED,
    response_model=ContractAnalysisResponse,
)
async def analyze_contract(
    current_user: CurrentUser,
    session: SessionDep,
    file: UploadFile = File(...),
) -> ContractAnalysisResponse:
    """Upload a PDF Kaufvertrag and receive an AI clause-by-clause analysis.

    Premium users see all clauses. Free users see the first 3 only.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted",
        )

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size must not exceed 20 MB",
        )

    try:
        _validate_pdf_bytes(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    record = await contract_service.analyze_contract_pdf(
        session=session,
        user_id=current_user.id,
        filename=file.filename,
        file_bytes=file_bytes,
    )

    is_premium = current_user.subscription_tier in (
        SubscriptionTier.PREMIUM,
        SubscriptionTier.ENTERPRISE,
    )
    return _build_response(record, is_premium=is_premium)


@router.get("/", response_model=ContractAnalysisListResponse)
async def list_contract_analyses(
    current_user: CurrentUser,
    session: SessionDep,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
) -> ContractAnalysisListResponse:
    """List all contract analyses for the current user."""
    records, total = contract_service.list_analyses(
        session, current_user.id, page=page, page_size=page_size
    )
    all_clauses_counts = [len(r.analyzed_clauses or []) for r in records]
    data = [
        ContractAnalysisListItem(
            id=r.id,
            filename=r.filename,
            share_id=r.share_id,
            overall_risk_assessment=r.overall_risk_assessment,
            clause_count=count,
            created_at=r.created_at,
        )
        for r, count in zip(records, all_clauses_counts, strict=True)
    ]
    return ContractAnalysisListResponse(
        data=data, total=total, page=page, page_size=page_size
    )


@router.get("/{analysis_id}", response_model=ContractAnalysisResponse)
async def get_contract_analysis(
    analysis_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> ContractAnalysisResponse:
    """Get a specific contract analysis owned by the current user."""
    try:
        record = contract_service.get_analysis_by_id(
            session, analysis_id, current_user.id
        )
    except contract_service.ContractAnalysisNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis {analysis_id} not found",
        )

    is_premium = current_user.subscription_tier in (
        SubscriptionTier.PREMIUM,
        SubscriptionTier.ENTERPRISE,
    )
    return _build_response(record, is_premium=is_premium)


@router.post(
    "/{analysis_id}/share",
    response_model=ContractAnalysisResponse,
)
async def share_contract_analysis(
    analysis_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> ContractAnalysisResponse:
    """Generate a shareable link for a contract analysis."""
    try:
        record = contract_service.generate_share_id(
            session, analysis_id, current_user.id
        )
    except contract_service.ContractAnalysisNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis {analysis_id} not found",
        )

    is_premium = current_user.subscription_tier in (
        SubscriptionTier.PREMIUM,
        SubscriptionTier.ENTERPRISE,
    )
    return _build_response(record, is_premium=is_premium)
