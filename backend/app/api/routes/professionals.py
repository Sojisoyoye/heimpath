"""Professional network directory API endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.schemas.professional import (
    ProfessionalDetailResponse,
    ProfessionalListResponse,
    ProfessionalResponse,
    ReviewCreateRequest,
    ReviewResponse,
)
from app.services import professional_service

router = APIRouter(prefix="/professionals", tags=["professionals"])


# ---------------------------------------------------------------------------
# Public endpoints (no auth required)
# ---------------------------------------------------------------------------


@router.get("/", response_model=ProfessionalListResponse)
async def list_professionals(
    session: Session = Depends(get_db),
    type: str | None = None,
    city: str | None = None,
    language: str | None = None,
    min_rating: float | None = Query(None, ge=0, le=5),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> ProfessionalListResponse:
    """Get paginated list of professionals with optional filters."""
    professionals, total = professional_service.get_professionals(
        session,
        professional_type=type,
        city=city,
        language=language,
        min_rating=min_rating,
        page=page,
        page_size=page_size,
    )
    data = [ProfessionalResponse.model_validate(p) for p in professionals]
    return ProfessionalListResponse(
        data=data,
        count=len(data),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{professional_id}", response_model=ProfessionalDetailResponse)
async def get_professional(
    professional_id: uuid.UUID,
    session: Session = Depends(get_db),
) -> ProfessionalDetailResponse:
    """Get professional detail with reviews."""
    try:
        professional = professional_service.get_professional_by_id(
            session, professional_id
        )
    except professional_service.ProfessionalNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professional {professional_id} not found",
        )

    reviews = professional_service.get_reviews_for_professional(
        session, professional_id
    )
    review_responses = [ReviewResponse.model_validate(r) for r in reviews]

    return ProfessionalDetailResponse(
        **ProfessionalResponse.model_validate(professional).model_dump(),
        reviews=review_responses,
    )


# ---------------------------------------------------------------------------
# Auth required endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/{professional_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    professional_id: uuid.UUID,
    request: ReviewCreateRequest,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> ReviewResponse:
    """Submit a review for a professional."""
    try:
        review = professional_service.submit_review(
            session,
            professional_id=professional_id,
            user_id=current_user.id,
            rating=request.rating,
            comment=request.comment,
        )
    except professional_service.ProfessionalNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professional {professional_id} not found",
        )
    except professional_service.DuplicateReviewError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this professional",
        )

    return ReviewResponse.model_validate(review)
