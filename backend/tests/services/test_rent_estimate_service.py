"""Tests for rent_estimate_service."""

import pytest

from app.services.rent_estimate_service import estimate_rent


# Override session-level db fixture — pure unit tests, no database needed.
@pytest.fixture(scope="session", autouse=False)
def db() -> None:
    """Override the db fixture to not initialise database for unit tests."""


class TestEstimateRentCityRecognition:
    """City postcodes return high confidence with Mietspiegel source."""

    @pytest.mark.parametrize(
        "postcode,expected_city",
        [
            ("10115", "Berlin"),
            ("80331", "Munich"),
            ("20095", "Hamburg"),
            ("60306", "Frankfurt"),
            ("50667", "Cologne"),
            ("40210", "Düsseldorf"),
            ("70173", "Stuttgart"),
            ("04103", "Leipzig"),
            ("01067", "Dresden"),
        ],
    )
    def test_recognises_city(self, postcode: str, expected_city: str) -> None:
        result = estimate_rent(postcode)
        assert result["city"] == expected_city
        assert result["confidence"] == "high"
        assert expected_city in result["source"]

    def test_berlin_returns_correct_avg_rent(self) -> None:
        result = estimate_rent("10115")
        assert result["estimated_rent_per_sqm"] == 13.5

    def test_munich_returns_correct_avg_rent(self) -> None:
        result = estimate_rent("80331")
        assert result["estimated_rent_per_sqm"] == 19.5


class TestEstimateRentStateFallback:
    """Non-city postcodes fall back to state average."""

    def test_rural_postcode_falls_back_to_state(self) -> None:
        # 99999 is in Thüringen (TH)
        result = estimate_rent("99999")
        assert result["confidence"] == "medium"
        assert result["state_code"] == "TH"
        assert result["city"] is None
        assert result["estimated_rent_per_sqm"] == 6.5

    def test_brandenburg_rural(self) -> None:
        # 15000 is in Brandenburg
        result = estimate_rent("15000")
        assert result["confidence"] == "medium"
        assert result["state_code"] == "BB"
        assert result["estimated_rent_per_sqm"] == 8.0


class TestBuildingYearAdjustment:
    """Building year adjusts the estimated rent for city postcodes."""

    def test_old_building_reduces_rent(self) -> None:
        result = estimate_rent("10115", building_year=1900)
        # Berlin base 13.5 + pre_1918 adjustment -0.8 = 12.7
        assert result["estimated_rent_per_sqm"] == pytest.approx(12.7)

    def test_new_building_increases_rent(self) -> None:
        result = estimate_rent("10115", building_year=2020)
        # Berlin base 13.5 + post_2014 adjustment 1.5 = 15.0
        assert result["estimated_rent_per_sqm"] == pytest.approx(15.0)

    def test_mid_range_building_no_adjustment(self) -> None:
        result = estimate_rent("10115", building_year=1985)
        # 1978-1990 bracket has 0.0 adjustment
        assert result["estimated_rent_per_sqm"] == pytest.approx(13.5)

    def test_building_year_ignored_for_state_fallback(self) -> None:
        result = estimate_rent("99999", building_year=2020)
        # State fallback does not apply building year adjustment
        assert result["estimated_rent_per_sqm"] == 6.5


class TestMonthlyRentCalculation:
    """Monthly rent is calculated when size_sqm is provided."""

    def test_monthly_rent_with_size(self) -> None:
        result = estimate_rent("10115", size_sqm=75)
        # 13.5 * 75 = 1012.5 → rounded to 1012
        assert result["monthly_rent"] == round(13.5 * 75)

    def test_monthly_rent_none_without_size(self) -> None:
        result = estimate_rent("10115")
        assert result["monthly_rent"] is None

    def test_monthly_rent_with_building_year_and_size(self) -> None:
        result = estimate_rent("80331", size_sqm=60, building_year=2020)
        # Munich base 19.5 + post_2014 2.5 = 22.0; 22.0 * 60 = 1320
        assert result["monthly_rent"] == round(22.0 * 60)


class TestRentRange:
    """Rent range is returned correctly."""

    def test_city_rent_range(self) -> None:
        result = estimate_rent("10115")
        assert result["rent_range"] == {"min": 10.0, "max": 17.0}

    def test_state_rent_range(self) -> None:
        result = estimate_rent("99999")
        assert result["rent_range"] == {"min": 5.0, "max": 8.5}
