"""Notification API endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.api.deps import CurrentUser, get_db
from app.models import Message
from app.schemas.notification import (
    NotificationListResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    NotificationResponse,
)
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=NotificationListResponse)
def list_notifications(
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
) -> NotificationListResponse:
    """Get paginated notifications for the current user."""
    return notification_service.get_notifications(
        session,
        current_user.id,
        limit=limit,
        offset=offset,
        unread_only=unread_only,
    )


@router.put("/mark-all-read", response_model=Message)
def mark_all_notifications_read(
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> Message:
    """Mark all unread notifications as read."""
    count = notification_service.mark_all_read(session, current_user.id)
    return Message(message=f"{count} notifications marked as read")


@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> NotificationPreferencesResponse:
    """Get notification preferences for the current user."""
    return notification_service.get_preferences(session, current_user.id)


@router.put("/preferences", response_model=NotificationPreferencesResponse)
def update_notification_preferences(
    request: NotificationPreferencesUpdate,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
) -> NotificationPreferencesResponse:
    """Update notification preferences for the current user."""
    return notification_service.update_preferences(
        session, current_user.id, request.preferences
    )


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
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
def delete_notification(
    notification_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: CurrentUser = None,
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
