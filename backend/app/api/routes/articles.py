"""Content Library article API endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.deps import (
    CurrentUser,
    OptionalCurrentUser,
    get_current_active_superuser,
    get_db,
)
from app.models.article import ArticleCategory, DifficultyLevel
from app.schemas.article import (
    ArticleCategoryInfo,
    ArticleCreateRequest,
    ArticleDetailResponse,
    ArticleListResponse,
    ArticleRatingRequest,
    ArticleRatingResponse,
    ArticleSearchResponse,
    ArticleSearchResult,
    ArticleSummary,
    ArticleUpdateRequest,
)
from app.services import article_service

router = APIRouter(prefix="/articles", tags=["articles"])


# ---------------------------------------------------------------------------
# Public endpoints (no auth required)
# ---------------------------------------------------------------------------


@router.get("/", response_model=ArticleListResponse)
def list_articles(
    session: Session = Depends(get_db),
    category: ArticleCategory | None = None,
    difficulty_level: DifficultyLevel | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> ArticleListResponse:
    """Get paginated list of published articles."""
    articles, total = article_service.get_articles(
        session,
        category=category,
        difficulty_level=difficulty_level,
        page=page,
        page_size=page_size,
    )
    summaries = [ArticleSummary.model_validate(a) for a in articles]
    return ArticleListResponse(
        data=summaries,
        count=len(summaries),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/search", response_model=ArticleSearchResponse)
def search_articles(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_db),
) -> ArticleSearchResponse:
    """Search articles using full-text search."""
    results = article_service.search_articles(session, q, limit)
    search_results = []
    for article, score in results:
        summary = ArticleSummary.model_validate(article)
        search_results.append(
            ArticleSearchResult(
                **summary.model_dump(),
                relevance_score=score,
            )
        )
    return ArticleSearchResponse(
        data=search_results,
        count=len(search_results),
        query=q,
    )


@router.get("/categories", response_model=list[ArticleCategoryInfo])
def get_categories(
    session: Session = Depends(get_db),
) -> list[ArticleCategoryInfo]:
    """Get article categories with counts."""
    return article_service.get_categories(session)


@router.get("/{slug}", response_model=ArticleDetailResponse)
def get_article(
    slug: str,
    session: Session = Depends(get_db),
    current_user: OptionalCurrentUser = None,
) -> ArticleDetailResponse:
    """Get article detail by slug. Increments view count."""
    try:
        article = article_service.get_article_by_slug(session, slug)
    except article_service.ArticleNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article '{slug}' not found",
        )

    # Increment view count
    article_service.increment_view_count(session, article.id)

    # Get rating stats
    user_id = current_user.id if current_user else None
    rating_stats = article_service.get_article_rating_stats(
        session, article.id, user_id
    )

    # Get related articles
    related = article_service.get_related_articles(session, article)
    related_summaries = [ArticleSummary.model_validate(a) for a in related]

    return ArticleDetailResponse(
        **ArticleSummary.model_validate(article).model_dump(),
        meta_description=article.meta_description,
        status=article.status,
        content=article.content,
        key_takeaways=article.key_takeaways or [],
        related_law_ids=article.related_law_ids or [],
        related_calculator_types=article.related_calculator_types or [],
        updated_at=article.updated_at,
        helpful_count=rating_stats["helpful_count"],
        not_helpful_count=rating_stats["not_helpful_count"],
        user_rating=rating_stats["user_rating"],
        related_articles=related_summaries,
    )


# ---------------------------------------------------------------------------
# Auth required endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/{slug}/rate",
    response_model=ArticleRatingResponse,
    status_code=status.HTTP_201_CREATED,
)
def rate_article(
    slug: str,
    request: ArticleRatingRequest,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> ArticleRatingResponse:
    """Rate an article as helpful or not helpful."""
    try:
        article = article_service.get_article_by_slug(session, slug)
    except article_service.ArticleNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article '{slug}' not found",
        )

    article_service.rate_article(
        session, article.id, current_user.id, request.is_helpful
    )

    stats = article_service.get_article_rating_stats(
        session, article.id, current_user.id
    )
    return ArticleRatingResponse(**stats)


# ---------------------------------------------------------------------------
# Admin endpoints (superuser only)
# ---------------------------------------------------------------------------


@router.post(
    "/",
    response_model=ArticleDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_article(
    request: ArticleCreateRequest,
    session: Session = Depends(get_db),
    _current_user=Depends(get_current_active_superuser),
) -> ArticleDetailResponse:
    """Create a new article (admin only)."""
    try:
        article = article_service.create_article(session, request.model_dump())
    except article_service.ArticleSlugExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return ArticleDetailResponse.model_validate(article)


@router.put("/{article_id}", response_model=ArticleDetailResponse)
def update_article(
    article_id: uuid.UUID,
    request: ArticleUpdateRequest,
    session: Session = Depends(get_db),
    _current_user=Depends(get_current_active_superuser),
) -> ArticleDetailResponse:
    """Update an article (admin only)."""
    try:
        article = article_service.update_article(
            session,
            article_id,
            request.model_dump(exclude_unset=True),
        )
    except article_service.ArticleNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article {article_id} not found",
        )
    except article_service.ArticleSlugExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return ArticleDetailResponse.model_validate(article)


@router.delete(
    "/{article_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_article(
    article_id: uuid.UUID,
    session: Session = Depends(get_db),
    _current_user=Depends(get_current_active_superuser),
) -> None:
    """Delete an article (admin only)."""
    try:
        article_service.delete_article(session, article_id)
    except article_service.ArticleNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article {article_id} not found",
        )
