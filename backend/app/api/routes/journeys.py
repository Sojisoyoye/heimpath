"""Journey API endpoints.

Provides endpoints for creating and managing property buying journeys.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.models.journey import Journey, JourneyStep, JourneyTask
from app.models.notification import NotificationType
from app.schemas.journey import (
    JourneyCreate,
    JourneyDetailResponse,
    JourneyProgressResponse,
    JourneyResponse,
    JourneysListResponse,
    JourneyStepResponse,
    JourneyStepSummary,
    JourneyStepUpdate,
    JourneyTaskResponse,
    JourneyTaskUpdate,
    JourneyUpdate,
    NextStepResponse,
    PropertyGoals,
    PropertyGoalsUpdate,
)
from app.services import journey_service as svc
from app.services import notification_service
from app.services.journey_service import (
    InvalidStepTransitionError,
    JourneyError,
    JourneyNotFoundError,
    StepNotFoundError,
)

router = APIRouter(prefix="/journeys", tags=["journeys"])


def _build_step_summary(step: JourneyStep) -> JourneyStepSummary:
    return JourneyStepSummary(
        id=step.id,
        step_number=step.step_number,
        phase=step.phase,
        title=step.title,
        status=step.status,
        estimated_duration_days=step.estimated_duration_days,
    )


def _build_task_response(task: JourneyTask) -> JourneyTaskResponse:
    return JourneyTaskResponse(
        id=task.id,
        order=task.order,
        title=task.title,
        description=task.description,
        is_required=task.is_required,
        is_completed=task.is_completed,
        completed_at=task.completed_at,
        resource_url=task.resource_url,
        resource_type=task.resource_type,
    )


def _build_step_response(step: JourneyStep) -> JourneyStepResponse:
    tasks = [_build_task_response(t) for t in step.tasks]
    return JourneyStepResponse(
        id=step.id,
        step_number=step.step_number,
        phase=step.phase,
        title=step.title,
        description=step.description,
        estimated_duration_days=step.estimated_duration_days,
        status=step.status,
        started_at=step.started_at,
        completed_at=step.completed_at,
        content_key=step.content_key,
        related_laws=step.related_laws,
        estimated_costs=step.estimated_costs,
        tasks=tasks,
    )


def _build_journey_response(journey: Journey) -> JourneyResponse:
    steps = [_build_step_summary(s) for s in journey.steps]
    return JourneyResponse(
        id=journey.id,
        title=journey.title,
        current_phase=journey.current_phase,
        current_step_number=journey.current_step_number,
        property_type=journey.property_type,
        property_location=journey.property_location,
        financing_type=journey.financing_type,
        is_first_time_buyer=journey.is_first_time_buyer,
        has_german_residency=journey.has_german_residency,
        budget_euros=journey.budget_euros,
        target_purchase_date=journey.target_purchase_date,
        property_goals=PropertyGoals(**journey.property_goals)
        if journey.property_goals
        else None,
        started_at=journey.started_at,
        completed_at=journey.completed_at,
        is_active=journey.is_active,
        created_at=journey.created_at,
        steps=steps,
    )


@router.post(
    "/",
    response_model=JourneyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_journey(
    request: JourneyCreate,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> JourneyResponse:
    """
    Create a new property buying journey from questionnaire answers.

    The journey will be personalized based on:
    - Property type and location
    - Financing needs
    - First-time buyer status
    - German residency status
    - Budget and timeline
    """
    journey = svc.generate_journey(
        session=session,
        user_id=current_user.id,
        title=request.title,
        answers=request.questionnaire,
    )
    return _build_journey_response(journey)


@router.get("/", response_model=JourneysListResponse)
async def list_journeys(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    active_only: bool = True,
) -> JourneysListResponse:
    """
    List all journeys for the current user.
    """
    journeys = svc.get_user_journeys(
        session=session,
        user_id=current_user.id,
        active_only=active_only,
    )
    journey_responses = [_build_journey_response(j) for j in journeys]
    return JourneysListResponse(data=journey_responses, count=len(journey_responses))


@router.get("/{journey_id}", response_model=JourneyDetailResponse)
async def get_journey(
    journey_id: uuid.UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> JourneyDetailResponse:
    """
    Get a specific journey with full step and task details.
    """
    try:
        journey = svc.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    steps = [_build_step_response(s) for s in journey.steps]

    return JourneyDetailResponse(
        id=journey.id,
        title=journey.title,
        current_phase=journey.current_phase,
        current_step_number=journey.current_step_number,
        property_type=journey.property_type,
        property_location=journey.property_location,
        financing_type=journey.financing_type,
        is_first_time_buyer=journey.is_first_time_buyer,
        has_german_residency=journey.has_german_residency,
        budget_euros=journey.budget_euros,
        target_purchase_date=journey.target_purchase_date,
        property_goals=PropertyGoals(**journey.property_goals)
        if journey.property_goals
        else None,
        started_at=journey.started_at,
        completed_at=journey.completed_at,
        is_active=journey.is_active,
        created_at=journey.created_at,
        steps=steps,
    )


@router.patch("/{journey_id}", response_model=JourneyResponse)
async def update_journey(
    journey_id: uuid.UUID,
    request: JourneyUpdate,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> JourneyResponse:
    """
    Update journey metadata.
    """
    try:
        journey = svc.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(journey, field, value)

    session.add(journey)
    session.commit()
    session.refresh(journey)

    return _build_journey_response(journey)


@router.get("/{journey_id}/progress", response_model=JourneyProgressResponse)
async def get_journey_progress(
    journey_id: uuid.UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> JourneyProgressResponse:
    """
    Get journey progress statistics.
    """
    try:
        journey = svc.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    progress = svc.get_progress(session, journey)
    return JourneyProgressResponse(**progress)


@router.get("/{journey_id}/next-step", response_model=NextStepResponse)
async def get_next_step(
    journey_id: uuid.UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> NextStepResponse:
    """
    Get the next recommended step for a journey.
    """
    try:
        journey = svc.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    next_step = svc.get_next_step(session, journey)

    if not next_step:
        return NextStepResponse(
            has_next=False,
            step=None,
            message="Congratulations! You have completed your property journey.",
        )

    return NextStepResponse(has_next=True, step=_build_step_response(next_step))


@router.patch(
    "/{journey_id}/steps/{step_id}",
    response_model=JourneyStepResponse,
)
async def update_step_status(
    journey_id: uuid.UUID,
    step_id: uuid.UUID,
    request: JourneyStepUpdate,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> JourneyStepResponse:
    """
    Update a step's status.

    Valid transitions:
    - not_started -> in_progress
    - in_progress -> completed
    - any -> skipped
    """
    try:
        journey = svc.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
        step = svc.update_step_status(
            session=session,
            journey=journey,
            step_id=step_id,
            new_status=request.status,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )
    except StepNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Step not found",
        )
    except InvalidStepTransitionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Send notification when step is completed
    if request.status == "completed":
        notification_service.create_notification(
            session,
            user_id=current_user.id,
            type=NotificationType.STEP_COMPLETED,
            title="Step Completed",
            message=f'You completed "{step.title}" in your property journey.',
            action_url=f"/journeys/{journey_id}",
        )

    return _build_step_response(step)


@router.patch(
    "/{journey_id}/steps/{step_id}/tasks/{task_id}",
    response_model=JourneyTaskResponse,
)
async def update_task_status(
    journey_id: uuid.UUID,
    step_id: uuid.UUID,
    task_id: uuid.UUID,
    request: JourneyTaskUpdate,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> JourneyTaskResponse:
    """
    Update a task's completion status.
    """
    try:
        journey = svc.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
        step = svc.get_step(session, journey_id, step_id)
        task = svc.update_task_status(
            session=session,
            step=step,
            task_id=task_id,
            is_completed=request.is_completed,
            journey=journey,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )
    except StepNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Step not found",
        )
    except JourneyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return _build_task_response(task)


@router.delete("/{journey_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journey(
    journey_id: uuid.UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> None:
    """
    Delete a journey (soft delete by setting is_active=False).
    """
    try:
        journey = svc.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    journey.is_active = False
    session.add(journey)
    session.commit()


@router.get("/{journey_id}/property-goals", response_model=PropertyGoals)
async def get_property_goals(
    journey_id: uuid.UUID,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> PropertyGoals:
    """
    Get property goals for a journey (Step 1 data).
    """
    try:
        journey = svc.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    if journey.property_goals:
        return PropertyGoals(**journey.property_goals)

    return PropertyGoals()


@router.patch("/{journey_id}/property-goals", response_model=PropertyGoals)
async def update_property_goals(
    journey_id: uuid.UUID,
    request: PropertyGoalsUpdate,
    current_user: CurrentUser,
    session: Session = Depends(get_db),
) -> PropertyGoals:
    """
    Update property goals for a journey (Step 1 data).

    This endpoint allows users to define their property preferences:
    - Number of rooms and bathrooms
    - Floor preferences
    - Must-have features (balcony, parking, etc.)
    - Size requirements
    - Additional notes
    """
    try:
        journey = svc.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    existing_goals = journey.property_goals or {}

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        existing_goals[field] = value

    journey.property_goals = existing_goals
    session.add(journey)
    session.commit()
    session.refresh(journey)

    return PropertyGoals(**journey.property_goals)
