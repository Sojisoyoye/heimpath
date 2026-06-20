"""Feedback API endpoints."""

from fastapi import APIRouter, BackgroundTasks, status

from app.api.deps import CurrentUser, SessionDep
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services import feedback_service

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    current_user: CurrentUser,
    session: SessionDep,
    background_tasks: BackgroundTasks,
    data: FeedbackCreate,
) -> FeedbackResponse:
    """Submit user feedback. Notifies admin via email and GrowthOS webhook in the background."""
    feedback = feedback_service.create_feedback_sync(session, current_user.id, data)
    background_tasks.add_task(
        feedback_service.notify_feedback, feedback, str(current_user.email)
    )
    return feedback
