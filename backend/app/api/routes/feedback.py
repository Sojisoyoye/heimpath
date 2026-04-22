"""Feedback API endpoints."""

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, SessionDep
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services import feedback_service

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    current_user: CurrentUser,
    session: SessionDep,
    data: FeedbackCreate,
) -> FeedbackResponse:
    """Submit user feedback."""
    return feedback_service.create_feedback(session, current_user.id, data)
