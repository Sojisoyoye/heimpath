"""Notification API endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, SessionDep
from app.models import Message
from app.schemas.notification import (
    NotificationListResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    NotificationResponse,
    UnsubscribeRequest,
    UnsubscribeResponse,
)
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
async def list_notifications(
    current_user: CurrentUser,
    session: SessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    unread_only: Annotated[bool, Query()] = False,
) -> NotificationListResponse:
    """Get paginated notifications for the current user."""
    return notification_service.get_notifications(
        session,
        current_user.id,
        limit=limit,
        offset=offset,
        unread_only=unread_only,
    )


@router.put("/mark-all-read")
async def mark_all_notifications_read(
    current_user: CurrentUser,
    session: SessionDep,
) -> Message:
    """Mark all unread notifications as read."""
    count = notification_service.mark_all_read(session, current_user.id)
    return Message(message=f"{count} notifications marked as read")


@router.get("/preferences")
async def get_notification_preferences(
    current_user: CurrentUser,
    session: SessionDep,
) -> NotificationPreferencesResponse:
    """Get notification preferences for the current user."""
    return notification_service.get_preferences(session, current_user.id)


@router.put("/preferences")
async def update_notification_preferences(
    request: NotificationPreferencesUpdate,
    current_user: CurrentUser,
    session: SessionDep,
) -> NotificationPreferencesResponse:
    """Update notification preferences for the current user."""
    return notification_service.update_preferences(
        session, current_user.id, request.preferences
    )


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> NotificationResponse:
    """Mark a single notification as read."""
    notification = notification_service.mark_as_read(
        session, notification_id, current_user.id
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return NotificationResponse(
        id=notification.id,
        type=notification.type,
        title=notification.title,
        message=notification.message,
        is_read=notification.is_read,
        action_url=notification.action_url,
        created_at=notification.created_at,
    )


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_notification(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    session: SessionDep,
) -> None:
    """Delete a notification."""
    deleted = notification_service.delete_notification(
        session, notification_id, current_user.id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )


@router.post("/unsubscribe")
async def unsubscribe(
    body: UnsubscribeRequest,
    session: SessionDep,
) -> UnsubscribeResponse:
    """Unsubscribe from email notifications via token (no auth required)."""
    from app.utils import verify_unsubscribe_token

    claims = verify_unsubscribe_token(body.token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired unsubscribe token",
        )

    try:
        notification_service.disable_email_for_type(
            session,
            user_id=uuid.UUID(claims["user_id"]),
            notification_type=claims["notification_type"],
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification type",
        )

    return UnsubscribeResponse(
        message="You have been unsubscribed successfully",
        notification_type=claims["notification_type"],
    )
