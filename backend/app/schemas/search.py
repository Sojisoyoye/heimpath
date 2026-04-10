"""Global search response schemas."""

from typing import Literal

from pydantic import BaseModel, ConfigDict


class SearchResultItem(BaseModel):
    """A single search result item from any content type."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    snippet: str
    result_type: Literal["law", "article"]
    url_path: str


class GlobalSearchResponse(BaseModel):
    """Response for global search across laws and articles."""

    query: str
    laws: list[SearchResultItem]
    articles: list[SearchResultItem]
    total_count: int
