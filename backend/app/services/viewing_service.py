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
    viewing = (
        session.execute(
            select(PropertyViewing).where(
                PropertyViewing.id == viewing_id,
                PropertyViewing.user_id == user_id,
            )
        )
        .scalars()
        .first()
    )
    if not viewing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Viewing not found"
        )
    return viewing


def list_user_viewings(
    session: Session,
    user_id: uuid.UUID,
) -> list[PropertyViewing]:
    return list(
        session.execute(
            select(PropertyViewing)
            .where(PropertyViewing.user_id == user_id)
            .order_by(PropertyViewing.created_at.desc())
        )
        .scalars()
        .all()
    )


def update_viewing(
    session: Session,
    viewing_id: uuid.UUID,
    user_id: uuid.UUID,
    data: PropertyViewingUpdate,
) -> PropertyViewing:
    viewing = get_viewing(session, viewing_id, user_id)

    # Use model_fields_set so explicit null values (e.g. PATCH {"notes":null})
    # correctly clear nullable fields. Non-nullable fields (address) skip null
    # values to avoid IntegrityError when clients send {"address": null}.
    _non_nullable = frozenset({"address", "checklist_data"})
    for field in data.model_fields_set:
        value = getattr(data, field)
        if value is None and field in _non_nullable:
            continue
        setattr(viewing, field, value)

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
