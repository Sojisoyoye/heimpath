"""Market comparison service.

Merges data from existing market data modules to provide side-by-side
city and state comparison metrics.  No database access required — all
data comes from static constants.
"""

from __future__ import annotations

from app.schemas.market_comparison import AreaSummary, ComparisonMetrics
from app.services.market_data import (
    CITY_MARKET_DATA,
    GERMAN_STATES,
    MARKET_DATA_BY_STATE,
)
from app.services.rent_estimate_service import CITY_MIETSPIEGEL


def _find_mietspiegel(city_name: str, state_code: str) -> dict | None:
    """Find Mietspiegel data for a city.

    First tries a direct name match, then falls back to a state-code lookup
    when exactly one Mietspiegel entry exists for that state (handles
    Berlin/Hamburg neighborhoods).
    """
    if city_name in CITY_MIETSPIEGEL:
        return CITY_MIETSPIEGEL[city_name]
    matches = [v for v in CITY_MIETSPIEGEL.values() if v["state_code"] == state_code]
    if len(matches) == 1:
        return matches[0]
    return None


def list_areas() -> list[AreaSummary]:
    """Return all available areas (cities + states) for comparison."""
    areas: list[AreaSummary] = []

    for state_code, cities in sorted(CITY_MARKET_DATA.items()):
        state_name = GERMAN_STATES[state_code]["name"]
        for city_name in sorted(cities):
            areas.append(
                AreaSummary(
                    key=f"{state_code}/{city_name}",
                    name=city_name,
                    area_type="city",
                    state_code=state_code,
                    state_name=state_name,
                )
            )

    for state_code in sorted(GERMAN_STATES):
        if state_code in MARKET_DATA_BY_STATE:
            areas.append(
                AreaSummary(
                    key=state_code,
                    name=GERMAN_STATES[state_code]["name"],
                    area_type="state",
                    state_code=state_code,
                    state_name=GERMAN_STATES[state_code]["name"],
                )
            )

    return areas


def compare_areas(keys: list[str]) -> list[ComparisonMetrics]:
    """Compare 2–4 areas by key and return merged metrics."""
    results: list[ComparisonMetrics] = []

    for key in keys:
        metrics = _build_metrics(key)
        if metrics is not None:
            results.append(metrics)

    return results


def _build_metrics(key: str) -> ComparisonMetrics | None:
    """Build ComparisonMetrics for a single area key."""
    if "/" in key:
        return _build_city_metrics(key)
    return _build_state_metrics(key)


def _build_city_metrics(key: str) -> ComparisonMetrics | None:
    """Build metrics for a city key like ``BY/Munich``."""
    state_code, city_name = key.split("/", 1)
    cities = CITY_MARKET_DATA.get(state_code, {})
    city_data = cities.get(city_name)
    if city_data is None:
        return None

    state_info = GERMAN_STATES.get(state_code)
    state_data = MARKET_DATA_BY_STATE.get(state_code)
    if state_info is None or state_data is None:
        return None

    mietspiegel = _find_mietspiegel(city_name, state_code)
    has_mietspiegel = mietspiegel is not None

    avg_rent: float | None = None
    rent_min: float | None = None
    rent_max: float | None = None
    gross_yield: float | None = None

    if mietspiegel:
        avg_rent = mietspiegel["avg_rent_per_sqm"]
        rent_min = mietspiegel["rent_range"]["min"]
        rent_max = mietspiegel["rent_range"]["max"]
        avg_price = city_data["avg_price_per_sqm"]
        if avg_price > 0:
            gross_yield = round((avg_rent * 12) / avg_price * 100, 2)

    return ComparisonMetrics(
        key=key,
        name=city_name,
        area_type="city",
        state_code=state_code,
        state_name=state_info["name"],
        avg_price_per_sqm=city_data["avg_price_per_sqm"],
        price_range_min=city_data["price_range"]["min"],
        price_range_max=city_data["price_range"]["max"],
        avg_rent_per_sqm=avg_rent,
        rent_range_min=rent_min,
        rent_range_max=rent_max,
        gross_rental_yield=gross_yield,
        transfer_tax_rate=state_info["transfer_tax_rate"],
        agent_fee_percent=state_data["agent_fee_percent"],
        trend=state_data["trend"],
        has_mietspiegel=has_mietspiegel,
    )


def _build_state_metrics(key: str) -> ComparisonMetrics | None:
    """Build metrics for a state key like ``BY``."""
    state_code = key
    state_info = GERMAN_STATES.get(state_code)
    state_data = MARKET_DATA_BY_STATE.get(state_code)
    if state_info is None or state_data is None:
        return None

    avg_rent = state_data["avg_rent_per_sqm"]
    avg_price = state_data["avg_price_per_sqm"]
    gross_yield: float | None = None
    if avg_price > 0:
        gross_yield = round((avg_rent * 12) / avg_price * 100, 2)

    return ComparisonMetrics(
        key=key,
        name=state_info["name"],
        area_type="state",
        state_code=state_code,
        state_name=state_info["name"],
        avg_price_per_sqm=avg_price,
        price_range_min=state_data["price_range"]["min"],
        price_range_max=state_data["price_range"]["max"],
        avg_rent_per_sqm=avg_rent,
        rent_range_min=state_data["rent_range"]["min"],
        rent_range_max=state_data["rent_range"]["max"],
        gross_rental_yield=gross_yield,
        transfer_tax_rate=state_info["transfer_tax_rate"],
        agent_fee_percent=state_data["agent_fee_percent"],
        trend=state_data["trend"],
        has_mietspiegel=True,
    )
