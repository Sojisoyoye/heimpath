"""Tests for market data computation."""

import pytest

from app.services.market_data import (
    GERMAN_STATES,
    MARKET_DATA_BY_STATE,
    PROPERTY_TYPE_MULTIPLIERS,
    compute_market_insights,
)


class TestComputeMarketInsights:
    """Tests for the compute_market_insights function."""

    def test_returns_none_for_none_location(self) -> None:
        result = compute_market_insights(
            property_location=None,
            property_type="apartment",
            budget_euros=300000,
            property_goals=None,
        )
        assert result is None

    def test_returns_none_for_unknown_location(self) -> None:
        result = compute_market_insights(
            property_location="Berlin",  # city name, not a state code
            property_type="apartment",
            budget_euros=300000,
            property_goals=None,
        )
        assert result is None

    def test_valid_state_code_returns_insights(self) -> None:
        result = compute_market_insights(
            property_location="BE",
            property_type="apartment",
            budget_euros=400000,
            property_goals=None,
        )
        assert result is not None
        assert result["state_code"] == "BE"
        assert result["state_name"] == "Berlin"
        assert result["trend"] == "rising"
        assert result["property_type"] == "apartment"
        assert result["type_multiplier"] == 1.0
        assert isinstance(result["generated_at"], str)
        assert len(result["hotspots"]) > 0

    def test_apartment_multiplier_applied_correctly(self) -> None:
        result = compute_market_insights(
            property_location="BY",
            property_type="apartment",
            budget_euros=None,
            property_goals=None,
        )
        assert result is not None
        expected_avg = round(MARKET_DATA_BY_STATE["BY"]["avg_price_per_sqm"] * 1.0)
        assert result["adjusted_avg_price_per_sqm"] == expected_avg

    def test_house_multiplier_applied_correctly(self) -> None:
        result = compute_market_insights(
            property_location="BY",
            property_type="house",
            budget_euros=None,
            property_goals=None,
        )
        assert result is not None
        multiplier = PROPERTY_TYPE_MULTIPLIERS["house"]
        expected_avg = round(
            MARKET_DATA_BY_STATE["BY"]["avg_price_per_sqm"] * multiplier
        )
        assert result["adjusted_avg_price_per_sqm"] == expected_avg
        assert result["type_multiplier"] == multiplier

    def test_goals_property_type_takes_precedence_over_journey_type(self) -> None:
        """Property type in goals overrides the journey-level property type."""
        result = compute_market_insights(
            property_location="BE",
            property_type="apartment",
            budget_euros=None,
            property_goals={"preferred_property_type": "house"},
        )
        assert result is not None
        assert result["property_type"] == "house"
        assert result["type_multiplier"] == PROPERTY_TYPE_MULTIPLIERS["house"]

    def test_estimated_size_computed_from_budget(self) -> None:
        location = "BE"
        budget = 520000
        result = compute_market_insights(
            property_location=location,
            property_type="apartment",
            budget_euros=budget,
            property_goals=None,
        )
        assert result is not None
        avg = MARKET_DATA_BY_STATE[location][
            "avg_price_per_sqm"
        ]  # apartment multiplier = 1.0
        expected_sqm = round(budget / avg)
        assert result["estimated_size_sqm"] == expected_sqm

    def test_estimated_size_is_none_when_no_budget(self) -> None:
        result = compute_market_insights(
            property_location="BE",
            property_type="apartment",
            budget_euros=None,
            property_goals=None,
        )
        assert result is not None
        assert result["estimated_size_sqm"] is None

    def test_transfer_tax_rate_matches_state(self) -> None:
        result = compute_market_insights(
            property_location="BY",
            property_type="apartment",
            budget_euros=None,
            property_goals=None,
        )
        assert result is not None
        assert result["transfer_tax_rate"] == GERMAN_STATES["BY"]["transfer_tax_rate"]

    def test_all_required_fields_present(self) -> None:
        result = compute_market_insights(
            property_location="HH",
            property_type="apartment",
            budget_euros=600000,
            property_goals=None,
        )
        required = [
            "state_code",
            "state_name",
            "avg_price_per_sqm",
            "price_range_min",
            "price_range_max",
            "agent_fee_percent",
            "trend",
            "hotspots",
            "transfer_tax_rate",
            "property_type",
            "type_multiplier",
            "adjusted_avg_price_per_sqm",
            "adjusted_min_price_per_sqm",
            "adjusted_max_price_per_sqm",
            "generated_at",
        ]
        assert result is not None
        for field in required:
            assert field in result, f"Missing field: {field}"

    @pytest.mark.parametrize("state_code", list(MARKET_DATA_BY_STATE.keys()))
    def test_all_states_return_valid_insights(self, state_code: str) -> None:
        result = compute_market_insights(
            property_location=state_code,
            property_type="apartment",
            budget_euros=300000,
            property_goals=None,
        )
        assert result is not None
        assert result["state_code"] == state_code
