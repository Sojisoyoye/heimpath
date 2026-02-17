"""Content Library article service."""

import math
import uuid

from sqlalchemy import func, select, text
from sqlmodel import Session

from app.models.article import (
    Article,
    ArticleCategory,
    ArticleRating,
    ArticleStatus,
    DifficultyLevel,
)
from app.schemas.article import ArticleCategoryInfo


class ArticleNotFoundError(Exception):
    """Raised when an article is not found."""

    pass


class ArticleSlugExistsError(Exception):
    """Raised when an article slug already exists."""

    pass


# --- Category metadata ---

CATEGORY_INFO: dict[str, dict[str, str]] = {
    ArticleCategory.BUYING_PROCESS.value: {
        "name": "Buying Process",
        "description": "Step-by-step guides to purchasing property in Germany",
    },
    ArticleCategory.COSTS_AND_TAXES.value: {
        "name": "Costs & Taxes",
        "description": "Understanding hidden costs, taxes, and fees in German real estate",
    },
    ArticleCategory.REGULATIONS.value: {
        "name": "Regulations",
        "description": "German property laws and regulations explained",
    },
    ArticleCategory.COMMON_PITFALLS.value: {
        "name": "Common Pitfalls",
        "description": "Mistakes to avoid when buying property in Germany",
    },
}


def _calculate_reading_time(content: str) -> int:
    """Calculate estimated reading time in minutes (200 WPM, min 1)."""
    word_count = len(content.split())
    return max(1, math.ceil(word_count / 200))


def get_articles(
    session: Session,
    category: ArticleCategory | None = None,
    difficulty_level: DifficultyLevel | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Article], int]:
    """Get paginated list of published articles."""
    query = select(Article).where(Article.status == ArticleStatus.PUBLISHED.value)

    if category:
        query = query.where(Article.category == category.value)

    if difficulty_level:
        query = query.where(Article.difficulty_level == difficulty_level.value)

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).scalar() or 0

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Article.created_at.desc()).offset(offset).limit(page_size)

    articles = session.exec(query).scalars().all()
    return list(articles), total


def get_article_by_slug(session: Session, slug: str) -> Article:
    """Get a published article by slug."""
    query = select(Article).where(
        Article.slug == slug,
        Article.status == ArticleStatus.PUBLISHED.value,
    )
    article = session.exec(query).scalars().first()
    if not article:
        raise ArticleNotFoundError(f"Article with slug '{slug}' not found")
    return article


def get_article_by_id(session: Session, article_id: uuid.UUID) -> Article:
    """Get an article by ID (any status, for admin)."""
    query = select(Article).where(Article.id == article_id)
    article = session.exec(query).scalars().first()
    if not article:
        raise ArticleNotFoundError(f"Article {article_id} not found")
    return article


def search_articles(
    session: Session,
    query_text: str,
    limit: int = 20,
) -> list[tuple[Article, float]]:
    """Search articles using full-text search."""
    search_query = text("""
        SELECT
            article.id,
            ts_rank(article.search_vector, plainto_tsquery('english', :query)) as rank
        FROM article
        WHERE article.search_vector @@ plainto_tsquery('english', :query)
            AND article.status = 'published'
        ORDER BY rank DESC
        LIMIT :limit
    """)

    result = session.execute(search_query, {"query": query_text, "limit": limit})

    articles_with_scores = []
    for row in result:
        article = get_article_by_id(session, row.id)
        articles_with_scores.append((article, float(row.rank)))

    return articles_with_scores


def get_categories(session: Session) -> list[ArticleCategoryInfo]:
    """Get all categories with article counts (published only)."""
    count_query = (
        select(Article.category, func.count(Article.id))
        .where(Article.status == ArticleStatus.PUBLISHED.value)
        .group_by(Article.category)
    )
    counts = {row[0]: row[1] for row in session.execute(count_query)}

    categories = []
    for key, info in CATEGORY_INFO.items():
        categories.append(
            ArticleCategoryInfo(
                key=key,
                name=info["name"],
                description=info["description"],
                article_count=counts.get(key, 0),
            )
        )
    return categories


def increment_view_count(session: Session, article_id: uuid.UUID) -> None:
    """Increment the view count for an article."""
    article = get_article_by_id(session, article_id)
    article.view_count = (article.view_count or 0) + 1
    session.add(article)
    session.commit()


def rate_article(
    session: Session,
    article_id: uuid.UUID,
    user_id: uuid.UUID,
    is_helpful: bool,
) -> None:
    """Rate an article (upsert: create or update existing rating)."""
    # Check article exists
    get_article_by_id(session, article_id)

    query = select(ArticleRating).where(
        ArticleRating.article_id == article_id,
        ArticleRating.user_id == user_id,
    )
    existing = session.exec(query).scalars().first()

    if existing:
        existing.is_helpful = is_helpful
        session.add(existing)
    else:
        rating = ArticleRating(
            article_id=article_id,
            user_id=user_id,
            is_helpful=is_helpful,
        )
        session.add(rating)

    session.commit()


def get_article_rating_stats(
    session: Session,
    article_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
) -> dict:
    """Get rating counts and current user's rating for an article."""
    helpful_count = (
        session.exec(
            select(func.count()).where(
                ArticleRating.article_id == article_id,
                ArticleRating.is_helpful.is_(True),
            )
        ).scalar()
        or 0
    )

    not_helpful_count = (
        session.exec(
            select(func.count()).where(
                ArticleRating.article_id == article_id,
                ArticleRating.is_helpful.is_(False),
            )
        ).scalar()
        or 0
    )

    user_rating = None
    if user_id:
        user_rating_val = session.exec(
            select(ArticleRating.is_helpful).where(
                ArticleRating.article_id == article_id,
                ArticleRating.user_id == user_id,
            )
        ).scalar()
        if user_rating_val is not None:
            user_rating = user_rating_val

    return {
        "helpful_count": helpful_count,
        "not_helpful_count": not_helpful_count,
        "user_rating": user_rating,
    }


def get_related_articles(
    session: Session, article: Article, limit: int = 3
) -> list[Article]:
    """Get related articles in the same category."""
    query = (
        select(Article)
        .where(
            Article.category == article.category,
            Article.id != article.id,
            Article.status == ArticleStatus.PUBLISHED.value,
        )
        .order_by(Article.created_at.desc())
        .limit(limit)
    )
    return list(session.exec(query).scalars().all())


def create_article(session: Session, data: dict) -> Article:
    """Create a new article (admin)."""
    # Check slug uniqueness
    existing = (
        session.exec(select(Article).where(Article.slug == data["slug"]))
        .scalars()
        .first()
    )
    if existing:
        raise ArticleSlugExistsError(
            f"Article with slug '{data['slug']}' already exists"
        )

    # Calculate reading time
    data["reading_time_minutes"] = _calculate_reading_time(data.get("content", ""))

    article = Article(**data)
    session.add(article)
    session.commit()
    session.refresh(article)
    return article


def update_article(session: Session, article_id: uuid.UUID, data: dict) -> Article:
    """Update an article (admin)."""
    article = get_article_by_id(session, article_id)

    # Check slug uniqueness if changing
    if "slug" in data and data["slug"] != article.slug:
        existing = (
            session.exec(select(Article).where(Article.slug == data["slug"]))
            .scalars()
            .first()
        )
        if existing:
            raise ArticleSlugExistsError(
                f"Article with slug '{data['slug']}' already exists"
            )

    # Recalculate reading time if content changed
    if "content" in data:
        data["reading_time_minutes"] = _calculate_reading_time(data["content"])

    for key, value in data.items():
        setattr(article, key, value)

    session.add(article)
    session.commit()
    session.refresh(article)
    return article


def delete_article(session: Session, article_id: uuid.UUID) -> None:
    """Delete an article (admin)."""
    article = get_article_by_id(session, article_id)
    session.delete(article)
    session.commit()
