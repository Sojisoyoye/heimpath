"""Tests for market_comparison_service."""

import pytest

from app.services.market_comparison_service import compare_areas, list_areas
from app.services.market_data import CITY_MARKET_DATA


# Override session-level db fixture — pure unit tests, no database needed.
@pytest.fixture(scope="session", autouse=False)
def db() -> None:
    """Override the db fixture to not initialise database for unit tests."""


class TestListAreas:
    """list_areas returns all cities and states."""

    def test_returns_all_cities(self) -> None:
        areas = list_areas()
        city_count = sum(
            len(cities) for cities in CITY_MARKET_DATA.values()
        )
        city_areas = [a for a in areas if a.area_type == "city"]
        assert len(city_areas) == city_count

    def test_returns_all_states(self) -> None:
        areas = list_areas()
        state_areas = [a for a in areas if a.area_type == "state"]
        assert len(state_areas) == 16

    def test_city_key_format(self) -> None:
        areas = list_areas()
        city = next(a for a in areas if a.area_type == "city")
        assert "/" in city.key
        state_code, name = city.key.split("/", 1)
        assert len(state_code) == 2
        assert name == city.name


class TestCompareTwoCities:
    """compare_areas returns correct metrics for two cities."""

    def test_compare_two_cities(self) -> None:
        results = compare_areas(["BY/Munich", "BW/Stuttgart"])
        assert len(results) == 2
        keys = {r.key for r in results}
        assert keys == {"BY/Munich", "BW/Stuttgart"}

    def test_metrics_populated(self) -> None:
        results = compare_areas(["BY/Munich", "BW/Stuttgart"])
        for r in results:
            assert r.avg_price_per_sqm > 0
            assert r.price_range_min > 0
            assert r.price_range_max > r.price_range_min
            assert r.transfer_tax_rate > 0
            assert r.state_name


class TestCityWithMietspiegel:
    """Cities with Mietspiegel data have rent + yield populated."""

    def test_munich_has_rent_data(self) -> None:
        results = compare_areas(["BY/Munich", "BW/Stuttgart"])
        munich = next(r for r in results if r.key == "BY/Munich")
        assert munich.has_mietspiegel is True
        assert munich.avg_rent_per_sqm is not None
        assert munich.rent_range_min is not None
        assert munich.rent_range_max is not None
        assert munich.gross_rental_yield is not None

    def test_berlin_neighborhood_uses_berlin_mietspiegel(self) -> None:
        results = compare_areas(["BE/Mitte", "BE/Kreuzberg"])
        for r in results:
            assert r.has_mietspiegel is True
            assert r.avg_rent_per_sqm == 13.5  # Berlin Mietspiegel avg


class TestCityWithoutMietspiegel:
    """Cities without Mietspiegel data have None rent fields."""

    def test_no_mietspiegel(self) -> None:
        results = compare_areas(["NW/Münster", "RP/Trier"])
        for r in results:
            assert r.has_mietspiegel is False
            assert r.avg_rent_per_sqm is None
            assert r.rent_range_min is None
            assert r.rent_range_max is None
            assert r.gross_rental_yield is None


class TestCompareInvalidKey:
    """Invalid keys are silently skipped."""

    def test_invalid_key_skipped(self) -> None:
        results = compare_areas(["BY/Munich", "XX/Nowhere"])
        assert len(results) == 1
        assert results[0].key == "BY/Munich"

    def test_all_invalid_returns_empty(self) -> None:
        results = compare_areas(["XX/Nowhere", "YY/Nope"])
        assert len(results) == 0


class TestCompareStates:
    """State-level keys return state averages."""

    def test_state_comparison(self) -> None:
        results = compare_areas(["BY", "BE"])
        assert len(results) == 2
        by = next(r for r in results if r.key == "BY")
        assert by.area_type == "state"
        assert by.name == "Bayern"
        assert by.avg_rent_per_sqm is not None
        assert by.has_mietspiegel is True


class TestGrossYieldCalculation:
    """Gross rental yield is computed correctly."""

    def test_formula(self) -> None:
        results = compare_areas(["BY/Munich", "BW/Stuttgart"])
        munich = next(r for r in results if r.key == "BY/Munich")
        # Munich: rent 19.5 €/sqm, price 7500 €/sqm
        expected = round((19.5 * 12) / 7500 * 100, 2)
        assert munich.gross_rental_yield == expected

    def test_state_yield(self) -> None:
        results = compare_areas(["BY", "BE"])
        by = next(r for r in results if r.key == "BY")
        # Bayern: rent 12.0, price 4500
        expected = round((12.0 * 12) / 4500 * 100, 2)
        assert by.gross_rental_yield == expected
