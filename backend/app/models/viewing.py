"""Property viewing database model."""

from sqlalchemy import Column, Date, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PropertyViewing(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Property viewing record with checklist state.

    checklist_data stores the full category/item tree as JSONB so the schema
    can evolve (items added/renamed) without migrations.
    """

    __tablename__ = "property_viewing"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Optional link to a journey property step
    journey_id = Column(
        UUID(as_uuid=True),
        ForeignKey("journey.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    address = Column(String(500), nullable=False)
    viewed_at = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    # Full checklist state: list of {id, label, items: [{id, label, checked, notes}]}
    checklist_data = Column(JSONB, nullable=False, server_default="'[]'::jsonb")
