"""Financing eligibility API endpoints.

Provides endpoints for financing eligibility assessments,
including saving, sharing, listing, and deleting.
"""
import uuid

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.schemas.financing import (
    FinancingAssessmentCreate,
    FinancingAssessmentListResponse,
    FinancingAssessmentResponse,
    FinancingAssessmentSummary,
)
from app.services import financing_service

router = APIRouter(prefix="/financing", tags=["financing"])


@router.get("/eligibility/share/{share_id}", response_model=FinancingAssessmentResponse)
def get_shared_assessment(
    share_id: str,
    session: Session = Depends(get_db),
) -> FinancingAssessmentResponse:
    """
    Get a shared financing assessment by share_id.

    No authentication required.
    """
    assessment = financing_service.get_by_share_id(session, share_id)
    return FinancingAssessmentResponse.model_validate(assessment)


@router.post(
    "/eligibility",
    response_model=FinancingAssessmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_assessment(
    request: FinancingAssessmentCreate,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> FinancingAssessmentResponse:
    """
    Assess financing eligibility and save the result.

    Requires authentication.
    """
    assessment = financing_service.save_assessment(
        session=session,
        user_id=current_user.id,
        inputs=request,
    )
    return FinancingAssessmentResponse.model_validate(assessment)


@router.get("/eligibility", response_model=FinancingAssessmentListResponse)
def list_assessments(
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> FinancingAssessmentListResponse:
    """
    Get all saved financing assessments for the current user.

    Requires authentication.
    """
    assessments = financing_service.list_user_assessments(session, current_user.id)
    summaries = [
        FinancingAssessmentSummary.model_validate(a)
        for a in assessments
    ]
    return FinancingAssessmentListResponse(
        data=summaries,
        count=len(summaries),
    )


@router.get("/eligibility/{assessment_id}", response_model=FinancingAssessmentResponse)
def get_assessment(
    assessment_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> FinancingAssessmentResponse:
    """
    Get a specific saved financing assessment by ID.

    Requires authentication and ownership.
    """
    assessment = financing_service.get_assessment(session, assessment_id, current_user.id)
    return FinancingAssessmentResponse.model_validate(assessment)


@router.delete(
    "/eligibility/{assessment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_assessment(
    assessment_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> None:
    """
    Delete a saved financing assessment.

    Requires authentication and ownership.
    """
    financing_service.delete_assessment(session, assessment_id, current_user.id)
