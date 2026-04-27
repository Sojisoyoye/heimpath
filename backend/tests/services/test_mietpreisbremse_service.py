"""Unit tests for mietpreisbremse_service.

All tests use mock sessions with seeded MietspiegelEntry fixtures.
No database connection is needed.
"""

from datetime import date
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.mietpreisbremse import MietspiegelEntry
from app.services.mietpreisbremse_service import (
    CEILING_MULTIPLIER,
    CITY_SOURCES,
    calculate,
    check_rent_ceiling,
    lookup_reference_rent,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_entry(
    city: str = "berlin",
    postcode_prefix: str | None = None,
    base_rent_per_sqm: float = 12.50,
    valid_from: date = date(2023, 1, 1),
    valid_to: date | None = None,
    source: str | None = None,
) -> MietspiegelEntry:
    """Create a populated MietspiegelEntry without a DB session."""
    entry = MietspiegelEntry()
    entry.city = city
    entry.postcode_prefix = postcode_prefix
    entry.base_rent_per_sqm = base_rent_per_sqm
    entry.valid_from = valid_from
    entry.valid_to = valid_to
    entry.source = source or CITY_SOURCES.get(city, "Test source")
    return entry


def _make_session_returning(entry: MietspiegelEntry | None) -> MagicMock:
    """Return a mock Session whose exec().first() yields the given entry."""
    mock_result = MagicMock()
    mock_result.first.return_value = entry
    session = MagicMock()
    session.exec.return_value = mock_result
    return session


# ---------------------------------------------------------------------------
# calculate() — pure function, no DB
# ---------------------------------------------------------------------------


class TestCalculate:
    def test_ceiling_is_110_percent_of_mietspiegel(self) -> None:
        """ceiling_rent == reference × sqm × 1.10."""
        entry = _make_entry(base_rent_per_sqm=10.0)
        result = calculate(entry, size_sqm=60.0, current_rent=500.0)

        expected_ceiling = 10.0 * 60.0 * CEILING_MULTIPLIER  # 660.0
        assert result["ceiling_rent"] == pytest.approx(expected_ceiling)
        assert result["maximum_legal_rent"] == pytest.approx(expected_ceiling)

    def test_over_limit_status(self) -> None:
        """Rent above ceiling → OVER_LIMIT, overpayment_eur > 0."""
        entry = _make_entry(base_rent_per_sqm=12.50)
        # ceiling ≈ 12.50 × 65 × 1.10 = 893.75
        result = calculate(entry, size_sqm=65.0, current_rent=1_400.0)

        assert result["status"] == "OVER_LIMIT"
        assert result["overpayment_eur"] == pytest.approx(1_400.0 - 893.75)
        assert result["room_to_increase_eur"] == 0.0

    def test_at_risk_status(self) -> None:
        """Rent at 97% of ceiling → AT_RISK."""
        entry = _make_entry(base_rent_per_sqm=10.0)
        ceiling = 10.0 * 50.0 * CEILING_MULTIPLIER  # 550.0
        rent = ceiling * 0.97

        result = calculate(entry, size_sqm=50.0, current_rent=rent)

        assert result["status"] == "AT_RISK"
        assert result["overpayment_eur"] == 0.0

    def test_within_limit_status(self) -> None:
        """Rent at 92% of ceiling → WITHIN_LIMIT."""
        entry = _make_entry(base_rent_per_sqm=10.0)
        ceiling = 10.0 * 50.0 * CEILING_MULTIPLIER  # 550.0
        rent = ceiling * 0.92

        result = calculate(entry, size_sqm=50.0, current_rent=rent)

        assert result["status"] == "WITHIN_LIMIT"
        assert result["overpayment_eur"] == 0.0

    def test_room_to_increase_status(self) -> None:
        """Rent at 80% of ceiling → ROOM_TO_INCREASE, room_to_increase_eur > 0."""
        entry = _make_entry(base_rent_per_sqm=10.0)
        ceiling = 10.0 * 50.0 * CEILING_MULTIPLIER  # 550.0
        rent = ceiling * 0.80

        result = calculate(entry, size_sqm=50.0, current_rent=rent)

        assert result["status"] == "ROOM_TO_INCREASE"
        assert result["room_to_increase_eur"] == pytest.approx(ceiling - rent)
        assert result["overpayment_eur"] == 0.0

    def test_data_source_from_city_sources(self) -> None:
        """data_source is taken from CITY_SOURCES lookup."""
        entry = _make_entry(city="berlin")
        result = calculate(entry, size_sqm=50.0, current_rent=400.0)
        assert result["data_source"] == CITY_SOURCES["berlin"]

    def test_disclaimer_present(self) -> None:
        entry = _make_entry()
        result = calculate(entry, size_sqm=50.0, current_rent=400.0)
        assert "Steuerberater" in result["disclaimer"]


# ---------------------------------------------------------------------------
# lookup_reference_rent() — uses mock session
# ---------------------------------------------------------------------------


class TestLookupReferenceRent:
    def test_exact_postcode_match(self) -> None:
        """First lookup attempt (full 5-digit postcode) returns entry."""
        entry = _make_entry(city="berlin", postcode_prefix="10115")
        session = _make_session_returning(entry)

        result = lookup_reference_rent(session, "berlin", "10115")

        assert result is entry
        # exec() called exactly once — found on first attempt
        session.exec.assert_called_once()

    def test_postcode_prefix_fallback(self) -> None:
        """No exact match → falls back to 2-digit prefix."""
        entry = _make_entry(city="berlin", postcode_prefix="10")

        # First call returns None (no exact match), second returns entry
        mock_results = [MagicMock(), MagicMock()]
        mock_results[0].first.return_value = None
        mock_results[1].first.return_value = entry

        session = MagicMock()
        session.exec.side_effect = mock_results

        result = lookup_reference_rent(session, "berlin", "10115")

        assert result is entry
        assert session.exec.call_count == 2

    def test_city_default_fallback(self) -> None:
        """No postcode match → uses NULL city-default entry."""
        entry = _make_entry(city="berlin", postcode_prefix=None)

        mock_results = [MagicMock(), MagicMock(), MagicMock()]
        mock_results[0].first.return_value = None
        mock_results[1].first.return_value = None
        mock_results[2].first.return_value = entry

        session = MagicMock()
        session.exec.side_effect = mock_results

        result = lookup_reference_rent(session, "berlin", "99999")

        assert result is entry
        assert session.exec.call_count == 3

    def test_unknown_city_raises_404(self) -> None:
        """No match at all → HTTPException 404."""
        mock_results = [MagicMock(), MagicMock(), MagicMock()]
        for m in mock_results:
            m.first.return_value = None

        session = MagicMock()
        session.exec.side_effect = mock_results

        with pytest.raises(HTTPException) as exc_info:
            lookup_reference_rent(session, "smalltown", "12345")

        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# check_rent_ceiling() — integration of lookup + calculate
# ---------------------------------------------------------------------------


class TestCheckRentCeiling:
    def test_full_check_over_limit(self) -> None:
        """Full flow: Berlin 10115, 65 sqm, 1400 EUR → OVER_LIMIT."""
        entry = _make_entry(city="berlin", base_rent_per_sqm=12.50)
        session = _make_session_returning(entry)

        result = check_rent_ceiling(
            session=session,
            city="berlin",
            postcode="10115",
            size_sqm=65.0,
            current_rent=1_400.0,
        )

        assert result["status"] == "OVER_LIMIT"
        assert result["ceiling_rent"] == pytest.approx(12.50 * 65 * 1.10)
        assert result["overpayment_eur"] > 0
