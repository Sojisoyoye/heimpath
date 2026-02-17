"""Dashboard API routes.

Single aggregation endpoint for the authenticated user's dashboard.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.schemas.dashboard import DashboardOverviewResponse
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> DashboardOverviewResponse:
    """Get aggregated dashboard overview for the current user."""
    return dashboard_service.get_dashboard_overview(
        session=session,
        user_id=current_user.id,
    )
