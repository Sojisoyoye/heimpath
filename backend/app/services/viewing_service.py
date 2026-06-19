"""Property viewing service — CRUD for viewing records and checklist state."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlmodel import Session

from app.models.viewing import PropertyViewing
from app.schemas.viewing import PropertyViewingCreate, PropertyViewingUpdate


def create_viewing(
    session: Session,
    user_id: uuid.UUID,
    data: PropertyViewingCreate,
) -> PropertyViewing:
    viewing = PropertyViewing(
        user_id=user_id,
        journey_id=data.journey_id,
        address=data.address,
        viewed_at=data.viewed_at,
        checklist_data=[],
    )
    session.add(viewing)
    session.commit()
    session.refresh(viewing)
    return viewing


def get_viewing(
    session: Session,
    viewing_id: uuid.UUID,
    user_id: uuid.UUID,
) -> PropertyViewing:
    viewing = session.exec(
        select(PropertyViewing).where(
            PropertyViewing.id == viewing_id,
            PropertyViewing.user_id == user_id,
        )
    ).first()
    if not viewing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Viewing not found")
    return viewing


def list_user_viewings(
    session: Session,
    user_id: uuid.UUID,
) -> list[PropertyViewing]:
    return list(
        session.exec(
            select(PropertyViewing)
            .where(PropertyViewing.user_id == user_id)
            .order_by(PropertyViewing.created_at.desc())
        ).all()
    )


def update_viewing(
    session: Session,
    viewing_id: uuid.UUID,
    user_id: uuid.UUID,
    data: PropertyViewingUpdate,
) -> PropertyViewing:
    viewing = get_viewing(session, viewing_id, user_id)

    if data.address is not None:
        viewing.address = data.address
    if data.viewed_at is not None:
        viewing.viewed_at = data.viewed_at
    if data.notes is not None:
        viewing.notes = data.notes
    if data.checklist_data is not None:
        viewing.checklist_data = data.checklist_data

    session.add(viewing)
    session.commit()
    session.refresh(viewing)
    return viewing


def delete_viewing(
    session: Session,
    viewing_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    viewing = get_viewing(session, viewing_id, user_id)
    session.delete(viewing)
    session.commit()
