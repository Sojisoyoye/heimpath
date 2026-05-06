"""Mietspiegel reference data model for Mietpreisbremse rent ceiling checks."""

from sqlalchemy import Column, Date, Float, Index, String

from app.models.base import Base, UUIDPrimaryKeyMixin


class MietspiegelEntry(UUIDPrimaryKeyMixin, Base):
    """
    Mietspiegel reference data entry.

    Stores base rent per sqm by city and postcode prefix.
    postcode_prefix is NULL for city-wide defaults (fallback when no prefix matches).
    No TimestampMixin — reference data has no audit trail requirement.
    """

    __tablename__ = "mietspiegel_entry"
    __table_args__ = (Index("ix_mietspiegel_city_postcode", "city", "postcode_prefix"),)

    city = Column(String(50), nullable=False, index=True)
    postcode_prefix = Column(String(5), nullable=True)
    base_rent_per_sqm = Column(Float, nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=True)
    source = Column(String(255), nullable=True)
