"""Legal Knowledge Base API endpoints.

Provides endpoints for browsing, searching, and bookmarking German real estate laws.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.models import Message
from app.models.legal import LawCategory, PropertyTypeApplicability
from app.schemas.legal import (
    BookmarkCreate,
    BookmarkListResponse,
    BookmarkResponse,
    CourtRulingResponse,
    JourneyStepLawResponse,
    JourneyStepLawsResponse,
    LawDetailResponse,
    LawFilter,
    LawListResponse,
    LawSearchResponse,
    LawSearchResult,
    LawSummary,
    StateVariationResponse,
)
from app.services.legal_service import (
    BookmarkAlreadyExistsError,
    BookmarkNotFoundError,
    LawNotFoundError,
    get_legal_service,
)

router = APIRouter(prefix="/laws", tags=["laws"])


@router.get("/", response_model=LawListResponse)
def list_laws(
    session: Session = Depends(get_db),
    category: LawCategory | None = None,
    property_type: PropertyTypeApplicability | None = None,
    state: str | None = Query(None, max_length=2, description="German state code"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> LawListResponse:
    """
    List all laws with optional filtering.

    Filter by:
    - category: Law category (buying_process, costs_and_taxes, rental_law, etc.)
    - property_type: Property type applicability
    - state: German state code for state-specific variations
    """
    service = get_legal_service()
    filters = LawFilter(
        category=category,
        property_type=property_type,
        state=state,
        page=page,
        page_size=page_size,
    )

    laws, total = service.get_laws(session, filters)

    law_summaries = [
        LawSummary(
            id=law.id,
            citation=law.citation,
            title_en=law.title_en,
            category=LawCategory(law.category),
            property_type=PropertyTypeApplicability(law.property_type),
            one_line_summary=law.one_line_summary,
        )
        for law in laws
    ]

    return LawListResponse(
        data=law_summaries,
        count=len(law_summaries),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/search", response_model=LawSearchResponse)
def search_laws(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, ge=1, le=50),
    session: Session = Depends(get_db),
) -> LawSearchResponse:
    """
    Search laws using full-text search.

    Searches across titles, summaries, and detailed explanations.
    Returns results ranked by relevance.
    """
    service = get_legal_service()
    results = service.search_laws(session, q, limit)

    search_results = [
        LawSearchResult(
            id=law.id,
            citation=law.citation,
            title_en=law.title_en,
            category=LawCategory(law.category),
            one_line_summary=law.one_line_summary,
            relevance_score=min(score, 1.0),  # Normalize to 0-1
            matched_fields=[],  # TODO: Add matched field tracking
        )
        for law, score in results
    ]

    return LawSearchResponse(
        data=search_results,
        count=len(search_results),
        query=q,
    )


@router.get("/categories")
def get_categories() -> dict:
    """
    Get all law categories with counts.
    """
    categories = [
        {
            "id": cat.value,
            "name": cat.name.replace("_", " ").title(),
            "description": _get_category_description(cat),
        }
        for cat in LawCategory
    ]
    return {"categories": categories}


def _get_category_description(category: LawCategory) -> str:
    """Get description for a category."""
    descriptions = {
        LawCategory.BUYING_PROCESS: "Laws governing the property purchase process",
        LawCategory.COSTS_AND_TAXES: "Tax laws and cost regulations for property transactions",
        LawCategory.RENTAL_LAW: "Landlord and tenant laws",
        LawCategory.CONDOMINIUM: "Condominium and co-ownership regulations",
        LawCategory.AGENT_REGULATIONS: "Real estate agent regulations and requirements",
    }
    return descriptions.get(category, "")


@router.get(
    "/by-journey-step/{step_content_key}", response_model=JourneyStepLawsResponse
)
def get_laws_for_journey_step(
    step_content_key: str,
    session: Session = Depends(get_db),
) -> JourneyStepLawsResponse:
    """
    Get laws relevant to a specific journey step.

    Laws are returned sorted by relevance score (highest first).
    """
    service = get_legal_service()
    results = service.get_laws_for_journey_step(session, step_content_key)

    law_responses = [
        JourneyStepLawResponse(
            law=LawSummary(
                id=law.id,
                citation=law.citation,
                title_en=law.title_en,
                category=LawCategory(law.category),
                property_type=PropertyTypeApplicability(law.property_type),
                one_line_summary=law.one_line_summary,
            ),
            relevance_score=score,
        )
        for law, score in results
    ]

    return JourneyStepLawsResponse(
        data=law_responses,
        count=len(law_responses),
        step_content_key=step_content_key,
    )


@router.get("/bookmarks", response_model=BookmarkListResponse)
def get_bookmarks(
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> BookmarkListResponse:
    """
    Get all bookmarked laws for the current user.
    """
    service = get_legal_service()
    bookmarks = service.get_user_bookmarks(session, current_user.id)

    bookmark_responses = [
        BookmarkResponse(
            id=bookmark.id,
            law_id=bookmark.law_id,
            notes=bookmark.notes,
            created_at=bookmark.created_at,
            law=LawSummary(
                id=bookmark.law.id,
                citation=bookmark.law.citation,
                title_en=bookmark.law.title_en,
                category=LawCategory(bookmark.law.category),
                property_type=PropertyTypeApplicability(bookmark.law.property_type),
                one_line_summary=bookmark.law.one_line_summary,
            ),
        )
        for bookmark in bookmarks
    ]

    return BookmarkListResponse(
        data=bookmark_responses,
        count=len(bookmark_responses),
    )


@router.get("/{law_id}", response_model=LawDetailResponse)
def get_law(
    law_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> LawDetailResponse:
    """
    Get a specific law with full details.

    Includes court rulings, state variations, and related laws.
    """
    service = get_legal_service()
    try:
        law = service.get_law(session, law_id)
    except LawNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Law not found",
        )

    # Get related laws
    related_laws = service.get_related_laws(session, law_id)
    related_law_summaries = [
        LawSummary(
            id=related.id,
            citation=related.citation,
            title_en=related.title_en,
            category=LawCategory(related.category),
            property_type=PropertyTypeApplicability(related.property_type),
            one_line_summary=related.one_line_summary,
        )
        for related in related_laws
    ]

    # Check bookmark status
    is_bookmarked = False
    if current_user:
        is_bookmarked = service.is_bookmarked(session, law_id, current_user.id)

    # Build court rulings response
    court_rulings = [
        CourtRulingResponse(
            id=ruling.id,
            court_name=ruling.court_name,
            case_number=ruling.case_number,
            ruling_date=ruling.ruling_date,
            title=ruling.title,
            summary=ruling.summary,
            significance=ruling.significance,
            source_url=ruling.source_url,
        )
        for ruling in law.court_rulings
    ]

    # Build state variations response
    state_variations = [
        StateVariationResponse(
            id=variation.id,
            state_code=variation.state_code,
            state_name=variation.state_name,
            variation_title=variation.variation_title,
            variation_value=variation.variation_value,
            variation_description=variation.variation_description,
            effective_date=variation.effective_date,
        )
        for variation in law.state_variations
    ]

    return LawDetailResponse(
        id=law.id,
        citation=law.citation,
        title_de=law.title_de,
        title_en=law.title_en,
        category=LawCategory(law.category),
        property_type=PropertyTypeApplicability(law.property_type),
        one_line_summary=law.one_line_summary,
        short_summary=law.short_summary,
        detailed_explanation=law.detailed_explanation,
        real_world_example=law.real_world_example,
        common_disputes=law.common_disputes,
        buyer_implications=law.buyer_implications,
        seller_implications=law.seller_implications,
        landlord_implications=law.landlord_implications,
        tenant_implications=law.tenant_implications,
        original_text_de=law.original_text_de,
        last_amended=law.last_amended,
        change_history=law.change_history,
        created_at=law.created_at,
        updated_at=law.updated_at,
        court_rulings=court_rulings,
        state_variations=state_variations,
        related_laws=related_law_summaries,
        is_bookmarked=is_bookmarked,
    )


@router.post(
    "/{law_id}/bookmark",
    response_model=BookmarkResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_bookmark(
    law_id: uuid.UUID,
    request: BookmarkCreate,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> BookmarkResponse:
    """
    Bookmark a law for later reference.
    """
    service = get_legal_service()
    try:
        bookmark = service.create_bookmark(
            session=session,
            law_id=law_id,
            user_id=current_user.id,
            notes=request.notes,
        )
    except LawNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Law not found",
        )
    except BookmarkAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Law is already bookmarked",
        )

    # Refresh to load law relationship
    session.refresh(bookmark)

    return BookmarkResponse(
        id=bookmark.id,
        law_id=bookmark.law_id,
        notes=bookmark.notes,
        created_at=bookmark.created_at,
        law=LawSummary(
            id=bookmark.law.id,
            citation=bookmark.law.citation,
            title_en=bookmark.law.title_en,
            category=LawCategory(bookmark.law.category),
            property_type=PropertyTypeApplicability(bookmark.law.property_type),
            one_line_summary=bookmark.law.one_line_summary,
        ),
    )


@router.delete("/{law_id}/bookmark", response_model=Message)
def delete_bookmark(
    law_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> Message:
    """
    Remove a law bookmark.
    """
    service = get_legal_service()
    try:
        service.delete_bookmark(
            session=session,
            law_id=law_id,
            user_id=current_user.id,
        )
    except BookmarkNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found",
        )

    return Message(message="Bookmark removed successfully")
