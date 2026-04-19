"""Professional network directory API endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, SessionDep
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


@router.get("/filters")
async def get_filter_options(session: SessionDep) -> dict:
    """Get available filter values (cities and languages) from the directory."""
    cities = professional_service.get_available_cities(session)
    languages = professional_service.get_available_languages(session)
    return {"cities": cities, "languages": languages}


@router.get("/")
async def list_professionals(
    session: SessionDep,
    type: str | None = None,
    city: str | None = None,
    language: str | None = None,
    min_rating: Annotated[float | None, Query(ge=0, le=5)] = None,
    sort_by: str | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ProfessionalListResponse:
    """Get paginated list of professionals with optional filters."""
    professionals, total = professional_service.get_professionals(
        session,
        professional_type=type,
        city=city,
        language=language,
        min_rating=min_rating,
        sort_by=sort_by,
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


@router.get("/{professional_id}")
async def get_professional(
    professional_id: uuid.UUID,
    session: SessionDep,
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
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    professional_id: uuid.UUID,
    request: ReviewCreateRequest,
    current_user: CurrentUser,
    session: SessionDep,
) -> ReviewResponse:
    """Submit a review for a professional."""
    try:
        review = professional_service.submit_review(
            session,
            professional_id=professional_id,
            user_id=current_user.id,
            rating=request.rating,
            comment=request.comment,
            service_used=request.service_used,
            language_used=request.language_used,
            would_recommend=request.would_recommend,
            response_time_rating=request.response_time_rating,
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
