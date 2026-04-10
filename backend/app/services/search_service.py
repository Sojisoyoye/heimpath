"""Global search service composing existing FTS functions."""

from sqlmodel import Session

from app.schemas.search import GlobalSearchResponse, SearchResultItem
from app.services.article_service import search_articles
from app.services.legal_service import search_laws


def _truncate(text: str, max_len: int = 200) -> str:
    """Truncate text to max_len, adding ellipsis if needed."""
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    truncated = text[:max_len]
    # Try to break at a word boundary; fall back to hard cut
    last_space = truncated.rfind(" ")
    if last_space > 0:
        truncated = truncated[:last_space]
    return truncated + "..."


def global_search(
    session: Session,
    query: str,
    limit: int = 10,
) -> GlobalSearchResponse:
    """Search across laws and articles, returning grouped results.

    Args:
        session: Database session
        query: Search query (min 2 chars)
        limit: Max results per content type

    Returns:
        Grouped search results with laws and articles
    """
    law_results = search_laws(session, query, limit)
    article_results = search_articles(session, query, limit)

    law_items = [
        SearchResultItem(
            id=str(law.id),
            title=law.title_en,
            snippet=_truncate(law.one_line_summary),
            result_type="law",
            url_path=f"/laws/{law.id}",
        )
        for law, _score in law_results
    ]

    article_items = [
        SearchResultItem(
            id=str(article.id),
            title=article.title,
            snippet=_truncate(article.excerpt),
            result_type="article",
            url_path=f"/articles/{article.slug}",
        )
        for article, _score in article_results
    ]

    return GlobalSearchResponse(
        query=query,
        laws=law_items,
        articles=article_items,
        total_count=len(law_items) + len(article_items),
    )
