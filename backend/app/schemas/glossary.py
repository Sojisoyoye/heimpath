"""Glossary schemas for API requests and responses."""

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.glossary import GlossaryCategory


# --- Term Schemas ---


class GlossaryTermSummary(BaseModel):
    """Summary view of a glossary term for list responses."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    term_de: str
    term_en: str
    slug: str
    definition_short: str
    category: GlossaryCategory


class GlossaryTermDetail(GlossaryTermSummary):
    """Full detail view of a glossary term."""

    definition_long: str
    example_usage: str | None = None
    related_terms: list[GlossaryTermSummary] = []


# --- Response Schemas ---


class GlossaryListResponse(BaseModel):
    """Paginated list of glossary terms."""

    data: list[GlossaryTermSummary]
    total: int
    page: int
    page_size: int


class GlossarySearchResponse(BaseModel):
    """Search results response."""

    query: str
    results: list[GlossaryTermSummary]
    total: int


class GlossaryCategoryInfo(BaseModel):
    """Category with term count."""

    id: str
    name: str
    count: int


class GlossaryCategoriesResponse(BaseModel):
    """List of categories with counts."""

    categories: list[GlossaryCategoryInfo]


# --- Filter Schema ---


class GlossaryFilter(BaseModel):
    """Filter parameters for glossary queries."""

    category: GlossaryCategory | None = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
