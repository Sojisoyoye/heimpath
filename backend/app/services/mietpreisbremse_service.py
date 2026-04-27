"""Service for Mietpreisbremse rent ceiling checks.

Looks up Mietspiegel reference data and calculates whether a given rent
exceeds the legal cap (Mietspiegel base × 1.10 per §556d BGB).

Lookup strategy: exact 5-digit postcode prefix → 2-digit prefix → city default (NULL).
"""

from datetime import date

from fastapi import HTTPException, status
from sqlmodel import Session, or_, select

from app.models.mietpreisbremse import MietspiegelEntry

CEILING_MULTIPLIER = 1.10

# At_risk band: rent >= 95% of ceiling
_AT_RISK_THRESHOLD = 0.95

# Within_limit band: rent >= 90% of ceiling
_WITHIN_LIMIT_THRESHOLD = 0.90

CITY_SOURCES: dict[str, str] = {
    "berlin": "Berlin Mietspiegel 2023",
    "hamburg": "Hamburg Mietspiegel 2023",
    "munich": "Munich Mietspiegel 2023",
    "frankfurt": "Frankfurt Mietspiegel 2024",
}

DISCLAIMER = (
    "Based on publicly available Mietspiegel data — "
    "verify with a licensed Steuerberater before any legal decisions."
)


def lookup_reference_rent(
    session: Session,
    city: str,
    postcode: str,
) -> MietspiegelEntry:
    """Return the best-matching Mietspiegel entry for city + postcode.

    Tries in order:
    1. Exact 5-digit postcode prefix
    2. First 2 digits of postcode
    3. City-wide default (postcode_prefix IS NULL)

    Raises HTTP 404 when no entry is found for the city at all.
    """
    today = date.today()
    for prefix in (postcode, postcode[:2], None):
        stmt = select(MietspiegelEntry).where(
            MietspiegelEntry.city == city,
            MietspiegelEntry.postcode_prefix == prefix,
            or_(
                MietspiegelEntry.valid_to.is_(None),  # type: ignore[union-attr]
                MietspiegelEntry.valid_to >= today,
            ),
        )
        entry = session.exec(stmt).first()
        if entry:
            return entry

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No Mietspiegel data found for city={city}",
    )


def calculate(
    entry: MietspiegelEntry,
    size_sqm: float,
    current_rent: float,
) -> dict:
    """Compute ceiling, status, and delta amounts from a Mietspiegel entry."""
    ceiling = entry.base_rent_per_sqm * size_sqm * CEILING_MULTIPLIER

    if current_rent > ceiling:
        rent_status = "OVER_LIMIT"
    elif current_rent >= ceiling * _AT_RISK_THRESHOLD:
        rent_status = "AT_RISK"
    elif current_rent >= ceiling * _WITHIN_LIMIT_THRESHOLD:
        rent_status = "WITHIN_LIMIT"
    else:
        rent_status = "ROOM_TO_INCREASE"

    return {
        "reference_rent_per_sqm": entry.base_rent_per_sqm,
        "ceiling_rent": ceiling,
        "status": rent_status,
        "overpayment_eur": max(0.0, current_rent - ceiling),
        "maximum_legal_rent": ceiling,
        "room_to_increase_eur": max(0.0, ceiling - current_rent),
        "data_source": CITY_SOURCES.get(entry.city, entry.source or ""),
        "disclaimer": DISCLAIMER,
    }


def check_rent_ceiling(
    session: Session,
    city: str,
    postcode: str,
    size_sqm: float,
    current_rent: float,
    building_year: int | None = None,  # accepted; reserved for future Mietspiegel age adjustments
) -> dict:
    """Full rent ceiling check: DB lookup + calculation.

    building_year is accepted for API compatibility but not used in MVP —
    real Mietspiegel age-bracket adjustments are a future data-ops task.
    """
    del building_year  # intentionally unused in MVP
    entry = lookup_reference_rent(session, city, postcode)
    return calculate(entry, size_sqm, current_rent)
