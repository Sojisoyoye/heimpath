"""Content Library article schemas for API requests and responses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.article import ArticleCategory, ArticleStatus, DifficultyLevel

# --- Article Summary (list views) ---


class ArticleSummary(BaseModel):
    """Summary view of an article for list responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    category: ArticleCategory
    difficulty_level: DifficultyLevel
    excerpt: str
    reading_time_minutes: int
    view_count: int
    author_name: str
    created_at: datetime


# --- Article Detail ---


class ArticleDetailResponse(BaseModel):
    """Full detail response for an article."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    meta_description: str
    category: ArticleCategory
    difficulty_level: DifficultyLevel
    status: ArticleStatus
    excerpt: str
    content: str
    key_takeaways: list[str] = []
    reading_time_minutes: int
    view_count: int
    author_name: str
    related_law_ids: list[str] = []
    related_calculator_types: list[str] = []
    created_at: datetime
    updated_at: datetime

    # Computed fields (set by route handler)
    helpful_count: int = 0
    not_helpful_count: int = 0
    user_rating: bool | None = None
    related_articles: list[ArticleSummary] = []


# --- List Response ---


class ArticleListResponse(BaseModel):
    """Paginated list of articles."""

    data: list[ArticleSummary]
    count: int
    total: int
    page: int
    page_size: int


# --- Search ---


class ArticleSearchResult(BaseModel):
    """Search result with relevance score."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    category: ArticleCategory
    difficulty_level: DifficultyLevel
    excerpt: str
    reading_time_minutes: int
    view_count: int
    author_name: str
    created_at: datetime
    relevance_score: float = Field(..., ge=0)


class ArticleSearchResponse(BaseModel):
    """Search results response."""

    data: list[ArticleSearchResult]
    count: int
    query: str


# --- Category Info ---


class ArticleCategoryInfo(BaseModel):
    """Category with article count."""

    key: str
    name: str
    description: str
    article_count: int


# --- Create/Update (Admin) ---


class ArticleCreateRequest(BaseModel):
    """Request schema for creating an article."""

    title: str = Field(..., max_length=500)
    slug: str = Field(..., max_length=255)
    meta_description: str = Field(..., max_length=320)
    category: ArticleCategory
    difficulty_level: DifficultyLevel
    excerpt: str
    content: str
    key_takeaways: list[str] = []
    author_name: str = Field(..., max_length=255)
    related_law_ids: list[str] = []
    related_calculator_types: list[str] = []
    status: ArticleStatus = ArticleStatus.DRAFT


class ArticleUpdateRequest(BaseModel):
    """Request schema for updating an article. All fields optional."""

    title: str | None = Field(None, max_length=500)
    slug: str | None = Field(None, max_length=255)
    meta_description: str | None = Field(None, max_length=320)
    category: ArticleCategory | None = None
    difficulty_level: DifficultyLevel | None = None
    excerpt: str | None = None
    content: str | None = None
    key_takeaways: list[str] | None = None
    author_name: str | None = Field(None, max_length=255)
    related_law_ids: list[str] | None = None
    related_calculator_types: list[str] | None = None
    status: ArticleStatus | None = None


# --- Rating ---


class ArticleRatingRequest(BaseModel):
    """Request schema for rating an article."""

    is_helpful: bool


class ArticleRatingResponse(BaseModel):
    """Response schema for article rating stats."""

    helpful_count: int
    not_helpful_count: int
    user_rating: bool | None = None
