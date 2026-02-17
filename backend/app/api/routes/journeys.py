"""Journey API endpoints.

Provides endpoints for creating and managing property buying journeys.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.models import Message
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
from app.services import notification_service
from app.services.journey_service import (
    InvalidStepTransitionError,
    JourneyNotFoundError,
    StepNotFoundError,
    get_journey_service,
)

router = APIRouter(prefix="/journeys", tags=["journeys"])


@router.post(
    "/",
    response_model=JourneyResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_journey(
    request: JourneyCreate,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
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
    service = get_journey_service()
    journey = service.generate_journey(
        session=session,
        user_id=current_user.id,
        title=request.title,
        answers=request.questionnaire,
    )

    # Convert to response with step summaries
    steps = [
        JourneyStepSummary(
            id=step.id,
            step_number=step.step_number,
            phase=step.phase,
            title=step.title,
            status=step.status,
            estimated_duration_days=step.estimated_duration_days,
        )
        for step in journey.steps
    ]

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


@router.get("/", response_model=JourneysListResponse)
def list_journeys(
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
    active_only: bool = True,
) -> JourneysListResponse:
    """
    List all journeys for the current user.
    """
    service = get_journey_service()
    journeys = service.get_user_journeys(
        session=session,
        user_id=current_user.id,
        active_only=active_only,
    )

    journey_responses = []
    for journey in journeys:
        steps = [
            JourneyStepSummary(
                id=step.id,
                step_number=step.step_number,
                phase=step.phase,
                title=step.title,
                status=step.status,
                estimated_duration_days=step.estimated_duration_days,
            )
            for step in journey.steps
        ]
        journey_responses.append(
            JourneyResponse(
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
        )

    return JourneysListResponse(data=journey_responses, count=len(journey_responses))


@router.get("/{journey_id}", response_model=JourneyDetailResponse)
def get_journey(
    journey_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> JourneyDetailResponse:
    """
    Get a specific journey with full step and task details.
    """
    service = get_journey_service()
    try:
        journey = service.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    # Build detailed step responses with tasks
    steps = []
    for step in journey.steps:
        tasks = [
            JourneyTaskResponse(
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
            for task in step.tasks
        ]
        steps.append(
            JourneyStepResponse(
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
        )

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
def update_journey(
    journey_id: uuid.UUID,
    request: JourneyUpdate,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> JourneyResponse:
    """
    Update journey metadata.
    """
    service = get_journey_service()
    try:
        journey = service.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(journey, field, value)

    session.add(journey)
    session.commit()
    session.refresh(journey)

    steps = [
        JourneyStepSummary(
            id=step.id,
            step_number=step.step_number,
            phase=step.phase,
            title=step.title,
            status=step.status,
            estimated_duration_days=step.estimated_duration_days,
        )
        for step in journey.steps
    ]

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


@router.get("/{journey_id}/progress", response_model=JourneyProgressResponse)
def get_journey_progress(
    journey_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> JourneyProgressResponse:
    """
    Get journey progress statistics.
    """
    service = get_journey_service()
    try:
        journey = service.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    progress = service.get_progress(session, journey)
    return JourneyProgressResponse(**progress)


@router.get("/{journey_id}/next-step", response_model=NextStepResponse)
def get_next_step(
    journey_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> NextStepResponse:
    """
    Get the next recommended step for a journey.
    """
    service = get_journey_service()
    try:
        journey = service.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    next_step = service.get_next_step(session, journey)

    if not next_step:
        return NextStepResponse(
            has_next=False,
            step=None,
            message="Congratulations! You have completed your property journey.",
        )

    tasks = [
        JourneyTaskResponse(
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
        for task in next_step.tasks
    ]

    step_response = JourneyStepResponse(
        id=next_step.id,
        step_number=next_step.step_number,
        phase=next_step.phase,
        title=next_step.title,
        description=next_step.description,
        estimated_duration_days=next_step.estimated_duration_days,
        status=next_step.status,
        started_at=next_step.started_at,
        completed_at=next_step.completed_at,
        content_key=next_step.content_key,
        related_laws=next_step.related_laws,
        estimated_costs=next_step.estimated_costs,
        tasks=tasks,
    )

    return NextStepResponse(has_next=True, step=step_response)


@router.patch(
    "/{journey_id}/steps/{step_id}",
    response_model=JourneyStepResponse,
)
def update_step_status(
    journey_id: uuid.UUID,
    step_id: uuid.UUID,
    request: JourneyStepUpdate,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> JourneyStepResponse:
    """
    Update a step's status.

    Valid transitions:
    - not_started -> in_progress
    - in_progress -> completed
    - any -> skipped
    """
    service = get_journey_service()
    try:
        journey = service.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
        step = service.update_step_status(
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

    tasks = [
        JourneyTaskResponse(
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
        for task in step.tasks
    ]

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


@router.patch(
    "/{journey_id}/steps/{step_id}/tasks/{task_id}",
    response_model=JourneyTaskResponse,
)
def update_task_status(
    journey_id: uuid.UUID,
    step_id: uuid.UUID,
    task_id: uuid.UUID,
    request: JourneyTaskUpdate,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> JourneyTaskResponse:
    """
    Update a task's completion status.
    """
    service = get_journey_service()
    try:
        _journey = service.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
        step = service.get_step(session, journey_id, step_id)
        task = service.update_task_status(
            session=session,
            step=step,
            task_id=task_id,
            is_completed=request.is_completed,
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
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

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


@router.delete("/{journey_id}", response_model=Message)
def delete_journey(
    journey_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> Message:
    """
    Delete a journey (soft delete by setting is_active=False).
    """
    service = get_journey_service()
    try:
        journey = service.get_journey(
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

    return Message(message="Journey deleted successfully")


@router.get("/{journey_id}/property-goals", response_model=PropertyGoals)
def get_property_goals(
    journey_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> PropertyGoals:
    """
    Get property goals for a journey (Step 1 data).
    """
    service = get_journey_service()
    try:
        journey = service.get_journey(
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
def update_property_goals(
    journey_id: uuid.UUID,
    request: PropertyGoalsUpdate,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
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
    service = get_journey_service()
    try:
        journey = service.get_journey(
            session=session,
            journey_id=journey_id,
            user_id=current_user.id,
        )
    except JourneyNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journey not found",
        )

    # Get existing goals or create new
    existing_goals = journey.property_goals or {}

    # Merge updates
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        existing_goals[field] = value

    journey.property_goals = existing_goals
    session.add(journey)
    session.commit()
    session.refresh(journey)

    return PropertyGoals(**journey.property_goals)
