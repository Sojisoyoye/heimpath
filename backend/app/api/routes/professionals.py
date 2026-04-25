"""Professional network directory API endpoints."""

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.models import User
from app.schemas.professional import (
    ContactInquiryCreateRequest,
    ContactInquiryResponse,
    ProfessionalCreateRequest,
    ProfessionalDetailResponse,
    ProfessionalListResponse,
    ProfessionalResponse,
    ProfessionalUpdateRequest,
    ReviewCreateRequest,
    ReviewResponse,
    SavedProfessionalListResponse,
    SavedProfessionalResponse,
)
from app.services import professional_service

SuperUser = Annotated[User, Depends(get_current_active_superuser)]

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
    sort_by: Annotated[
        Literal["rating", "reviews", "recommended"] | None, Query()
    ] = None,
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


@router.get("/saved")
async def get_saved_professionals(
    current_user: CurrentUser,
    session: SessionDep,
) -> SavedProfessionalListResponse:
    """Get all saved professionals for the current user."""
    saved = professional_service.get_saved_professionals(session, current_user.id)
    items = [SavedProfessionalResponse.model_validate(s) for s in saved]
    return SavedProfessionalListResponse(items=items, total=len(items))


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


@router.post(
    "/{professional_id}/inquiries",
    status_code=status.HTTP_201_CREATED,
)
async def create_inquiry(
    professional_id: uuid.UUID,
    request: ContactInquiryCreateRequest,
    _current_user: CurrentUser,
    session: SessionDep,
) -> ContactInquiryResponse:
    """Submit a contact inquiry to a professional."""
    try:
        inquiry = professional_service.submit_inquiry(
            session,
            professional_id=professional_id,
            sender_name=request.sender_name,
            sender_email=request.sender_email,
            message=request.message,
        )
    except professional_service.ProfessionalNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professional {professional_id} not found",
        )
    return ContactInquiryResponse.model_validate(inquiry)


@router.post(
    "/{professional_id}/save",
    status_code=status.HTTP_201_CREATED,
)
async def save_professional(
    professional_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> SavedProfessionalResponse:
    """Save a professional to the current user's list."""
    try:
        saved = professional_service.save_professional(
            session, professional_id, current_user.id
        )
    except professional_service.ProfessionalNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professional {professional_id} not found",
        )
    except professional_service.ProfessionalAlreadySavedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already saved this professional",
        )
    return SavedProfessionalResponse.model_validate(saved)


@router.delete(
    "/{professional_id}/save",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def unsave_professional(
    professional_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> None:
    """Remove a professional from the current user's saved list."""
    try:
        professional_service.unsave_professional(
            session, professional_id, current_user.id
        )
    except professional_service.SavedProfessionalNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved professional not found",
        )


@router.post("/{professional_id}/click", status_code=status.HTTP_200_OK)
async def track_professional_click(
    professional_id: uuid.UUID,
    session: SessionDep,
) -> dict:
    """Track a referral click for a professional (no auth required)."""
    try:
        professional_service.track_click(session, professional_id)
    except professional_service.ProfessionalNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professional {professional_id} not found",
        )
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Admin endpoints (superuser only)
# ---------------------------------------------------------------------------


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_professional(
    request: ProfessionalCreateRequest,
    session: SessionDep,
    _current_user: SuperUser,
) -> ProfessionalResponse:
    """Create a new professional (admin only)."""
    professional = professional_service.create_professional(
        session, request.model_dump()
    )
    return ProfessionalResponse.model_validate(professional)


@router.put("/{professional_id}")
async def update_professional(
    professional_id: uuid.UUID,
    request: ProfessionalUpdateRequest,
    session: SessionDep,
    _current_user: SuperUser,
) -> ProfessionalResponse:
    """Update a professional (admin only)."""
    try:
        professional = professional_service.update_professional(
            session,
            professional_id,
            request.model_dump(exclude_unset=True),
        )
    except professional_service.ProfessionalNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professional {professional_id} not found",
        )
    return ProfessionalResponse.model_validate(professional)


@router.delete("/{professional_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_professional(
    professional_id: uuid.UUID,
    session: SessionDep,
    _current_user: SuperUser,
) -> None:
    """Delete a professional (admin only)."""
    try:
        professional_service.delete_professional(session, professional_id)
    except professional_service.ProfessionalNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professional {professional_id} not found",
        )


@router.patch("/{professional_id}/verify")
async def toggle_verify_professional(
    professional_id: uuid.UUID,
    session: SessionDep,
    _current_user: SuperUser,
) -> ProfessionalResponse:
    """Toggle is_verified for a professional (admin only)."""
    try:
        professional = professional_service.get_professional_by_id(
            session, professional_id
        )
    except professional_service.ProfessionalNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Professional {professional_id} not found",
        )
    professional = professional_service.update_professional(
        session,
        professional_id,
        {"is_verified": not professional.is_verified},
    )
    return ProfessionalResponse.model_validate(professional)
