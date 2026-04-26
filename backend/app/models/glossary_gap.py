"""GlossaryGap database model — tracks German legal terms not yet in glossary."""

import uuid

from sqlalchemy import Column, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class GlossaryGap(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    GlossaryGap database model.

    Records German legal terms detected in uploaded documents that have no
    matching entry in the HeimPath glossary, enabling content editors to
    identify missing terminology for future glossary additions.
    """

    __tablename__ = "glossary_gap"

    term_de = Column(String(200), nullable=False, unique=True, index=True)
    occurrence_count = Column(Integer, nullable=False, default=1)
    first_seen_document_id = Column(UUID(as_uuid=True), nullable=True)

    def __repr__(self) -> str:
        return f"<GlossaryGap term_de={self.term_de!r} occurrences={self.occurrence_count}>"
