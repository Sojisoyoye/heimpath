"""Property viewing endpoints."""

import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, SessionDep
from app.schemas.viewing import (
    PropertyViewingCreate,
    PropertyViewingListResponse,
    PropertyViewingResponse,
    PropertyViewingUpdate,
)
from app.services import viewing_service

router = APIRouter(prefix="/viewings", tags=["viewings"])


@router.get("", response_model=PropertyViewingListResponse)
def list_viewings(
    session: SessionDep,
    current_user: CurrentUser,
) -> PropertyViewingListResponse:
    """List all property viewings for the current user."""
    viewings = viewing_service.list_user_viewings(session, current_user.id)
    return PropertyViewingListResponse(
        data=[PropertyViewingResponse.model_validate(v) for v in viewings],
        count=len(viewings),
    )


@router.post(
    "", response_model=PropertyViewingResponse, status_code=status.HTTP_201_CREATED
)
def create_viewing(
    session: SessionDep,
    current_user: CurrentUser,
    data: PropertyViewingCreate,
) -> PropertyViewingResponse:
    """Create a new property viewing record."""
    viewing = viewing_service.create_viewing(session, current_user.id, data)
    return PropertyViewingResponse.model_validate(viewing)


@router.get("/{viewing_id}", response_model=PropertyViewingResponse)
def get_viewing(
    session: SessionDep,
    current_user: CurrentUser,
    viewing_id: uuid.UUID,
) -> PropertyViewingResponse:
    """Get a single property viewing."""
    viewing = viewing_service.get_viewing(session, viewing_id, current_user.id)
    return PropertyViewingResponse.model_validate(viewing)


@router.patch("/{viewing_id}", response_model=PropertyViewingResponse)
def update_viewing(
    session: SessionDep,
    current_user: CurrentUser,
    viewing_id: uuid.UUID,
    data: PropertyViewingUpdate,
) -> PropertyViewingResponse:
    """Update checklist state, notes, or address for a viewing."""
    viewing = viewing_service.update_viewing(session, viewing_id, current_user.id, data)
    return PropertyViewingResponse.model_validate(viewing)


@router.delete("/{viewing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_viewing(
    session: SessionDep,
    current_user: CurrentUser,
    viewing_id: uuid.UUID,
) -> None:
    """Delete a property viewing record."""
    viewing_service.delete_viewing(session, viewing_id, current_user.id)
