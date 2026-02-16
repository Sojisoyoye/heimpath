"""Item database model."""

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Item(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Item database model."""

    __tablename__ = "item"

    title = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
    )

    owner = relationship("User", back_populates="items")
