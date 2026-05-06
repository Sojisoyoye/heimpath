"""Global search API endpoint."""

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.schemas.search import GlobalSearchResponse
from app.services.search_service import global_search

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/", response_model=GlobalSearchResponse)
async def search(
    _current_user: CurrentUser,
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Max results per type"),
    session: Session = Depends(get_db),
) -> GlobalSearchResponse:
    """Search across laws and articles.

    Returns grouped results with laws and articles sections.
    Requires authentication.
    """
    return global_search(session, q, limit)
