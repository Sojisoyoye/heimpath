"""Glossary API endpoints.

Provides public endpoints for browsing, searching, and viewing
German real estate glossary terms.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.deps import get_db
from app.models.glossary import GlossaryCategory
from app.schemas.glossary import (
    GlossaryCategoriesResponse,
    GlossaryCategoryInfo,
    GlossaryListResponse,
    GlossarySearchResponse,
    GlossaryTermDetail,
    GlossaryTermSummary,
)
from app.services.glossary_service import (
    GlossaryTermNotFoundError,
    get_categories,
    get_related_terms,
    get_term_by_slug,
    get_terms,
    search_terms,
)

router = APIRouter(prefix="/glossary", tags=["glossary"])

# Category display names
_CATEGORY_NAMES = {
    "buying_process": "Buying Process",
    "costs_taxes": "Costs & Taxes",
    "financing": "Financing",
    "legal": "Legal",
    "rental": "Rental",
    "property_types": "Property Types",
}


def _term_to_summary(term) -> GlossaryTermSummary:
    """Convert a GlossaryTerm model to a summary schema."""
    return GlossaryTermSummary(
        id=term.id,
        term_de=term.term_de,
        term_en=term.term_en,
        slug=term.slug,
        definition_short=term.definition_short,
        category=GlossaryCategory(term.category),
    )


@router.get("/", response_model=GlossaryListResponse)
async def list_terms(
    session: Session = Depends(get_db),
    category: GlossaryCategory | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> GlossaryListResponse:
    """
    List glossary terms with optional category filter and pagination.
    """
    terms, total = get_terms(session, category=category, page=page, page_size=page_size)

    return GlossaryListResponse(
        data=[_term_to_summary(t) for t in terms],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/search", response_model=GlossarySearchResponse)
async def search_glossary(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, ge=1, le=50),
    session: Session = Depends(get_db),
) -> GlossarySearchResponse:
    """
    Search glossary terms using full-text search.

    Searches across German terms, English translations, and definitions.
    """
    terms = search_terms(session, q, limit)

    return GlossarySearchResponse(
        query=q,
        results=[_term_to_summary(t) for t in terms],
        total=len(terms),
    )


@router.get("/categories", response_model=GlossaryCategoriesResponse)
async def list_categories(
    session: Session = Depends(get_db),
) -> GlossaryCategoriesResponse:
    """
    Get all glossary categories with term counts.
    """
    category_counts = get_categories(session)

    categories = [
        GlossaryCategoryInfo(
            id=cat_value,
            name=_CATEGORY_NAMES.get(cat_value, cat_value),
            count=count,
        )
        for cat_value, count in category_counts
    ]

    return GlossaryCategoriesResponse(categories=categories)


@router.get("/{slug}", response_model=GlossaryTermDetail)
async def get_term(
    slug: str,
    session: Session = Depends(get_db),
) -> GlossaryTermDetail:
    """
    Get a specific glossary term with full details and resolved related terms.
    """
    try:
        term = get_term_by_slug(session, slug)
    except GlossaryTermNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Glossary term not found",
        )

    # Resolve related terms
    related_slugs = term.related_terms or []
    related = get_related_terms(session, related_slugs)

    return GlossaryTermDetail(
        id=term.id,
        term_de=term.term_de,
        term_en=term.term_en,
        slug=term.slug,
        definition_short=term.definition_short,
        definition_long=term.definition_long,
        category=GlossaryCategory(term.category),
        example_usage=term.example_usage,
        related_terms=[_term_to_summary(r) for r in related],
    )
