"""Market data constants and computation for Step 2: Market Insights.

This module provides static German real estate market data and a function to
compute personalised market insights for a journey based on location, property
type, and budget.  The data mirrors the constants used in the frontend
(frontend/src/common/constants/propertyGoals.ts and index.ts) so that the
backend and frontend are always in sync.
"""

from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Static data: German states
# ---------------------------------------------------------------------------

GERMAN_STATES: dict[str, dict] = {
    "BW": {"name": "Baden-Württemberg", "transfer_tax_rate": 5.0},
    "BY": {"name": "Bayern", "transfer_tax_rate": 3.5},
    "BE": {"name": "Berlin", "transfer_tax_rate": 6.0},
    "BB": {"name": "Brandenburg", "transfer_tax_rate": 6.5},
    "HB": {"name": "Bremen", "transfer_tax_rate": 5.0},
    "HH": {"name": "Hamburg", "transfer_tax_rate": 5.5},
    "HE": {"name": "Hessen", "transfer_tax_rate": 6.0},
    "MV": {"name": "Mecklenburg-Vorpommern", "transfer_tax_rate": 6.0},
    "NI": {"name": "Niedersachsen", "transfer_tax_rate": 5.0},
    "NW": {"name": "Nordrhein-Westfalen", "transfer_tax_rate": 6.5},
    "RP": {"name": "Rheinland-Pfalz", "transfer_tax_rate": 5.0},
    "SL": {"name": "Saarland", "transfer_tax_rate": 6.5},
    "SN": {"name": "Sachsen", "transfer_tax_rate": 5.5},
    "ST": {"name": "Sachsen-Anhalt", "transfer_tax_rate": 5.0},
    "SH": {"name": "Schleswig-Holstein", "transfer_tax_rate": 6.5},
    "TH": {"name": "Thüringen", "transfer_tax_rate": 6.5},
}

# Average prices per sqm by German state (2024 estimates) — mirrors frontend
MARKET_DATA_BY_STATE: dict[str, dict] = {
    "BW": {
        "avg_price_per_sqm": 3800,
        "price_range": {"min": 2500, "max": 6000},
        "agent_fee_percent": 3.57,
        "trend": "stable",
        "hotspots": ["Stuttgart", "Freiburg", "Karlsruhe"],
    },
    "BY": {
        "avg_price_per_sqm": 4500,
        "price_range": {"min": 2800, "max": 9000},
        "agent_fee_percent": 3.57,
        "trend": "stable",
        "hotspots": ["Munich", "Nuremberg", "Augsburg"],
    },
    "BE": {
        "avg_price_per_sqm": 5200,
        "price_range": {"min": 3500, "max": 8000},
        "agent_fee_percent": 3.57,
        "trend": "rising",
        "hotspots": ["Mitte", "Prenzlauer Berg", "Kreuzberg"],
    },
    "BB": {
        "avg_price_per_sqm": 2800,
        "price_range": {"min": 1800, "max": 4500},
        "agent_fee_percent": 3.57,
        "trend": "rising",
        "hotspots": ["Potsdam", "Cottbus", "Brandenburg an der Havel"],
    },
    "HB": {
        "avg_price_per_sqm": 2900,
        "price_range": {"min": 2000, "max": 4500},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Bremen-Mitte", "Schwachhausen", "Horn-Lehe"],
    },
    "HH": {
        "avg_price_per_sqm": 5800,
        "price_range": {"min": 4000, "max": 10000},
        "agent_fee_percent": 3.12,
        "trend": "stable",
        "hotspots": ["Eppendorf", "Winterhude", "Eimsbüttel"],
    },
    "HE": {
        "avg_price_per_sqm": 3600,
        "price_range": {"min": 2200, "max": 7000},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Frankfurt", "Wiesbaden", "Darmstadt"],
    },
    "MV": {
        "avg_price_per_sqm": 2200,
        "price_range": {"min": 1400, "max": 4000},
        "agent_fee_percent": 2.98,
        "trend": "rising",
        "hotspots": ["Rostock", "Schwerin", "Greifswald"],
    },
    "NI": {
        "avg_price_per_sqm": 2600,
        "price_range": {"min": 1800, "max": 4500},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Hannover", "Braunschweig", "Oldenburg"],
    },
    "NW": {
        "avg_price_per_sqm": 3200,
        "price_range": {"min": 2000, "max": 6000},
        "agent_fee_percent": 3.57,
        "trend": "stable",
        "hotspots": ["Düsseldorf", "Cologne", "Münster"],
    },
    "RP": {
        "avg_price_per_sqm": 2400,
        "price_range": {"min": 1600, "max": 4000},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Mainz", "Koblenz", "Trier"],
    },
    "SL": {
        "avg_price_per_sqm": 2000,
        "price_range": {"min": 1400, "max": 3200},
        "agent_fee_percent": 3.57,
        "trend": "stable",
        "hotspots": ["Saarbrücken", "Neunkirchen", "Homburg"],
    },
    "SN": {
        "avg_price_per_sqm": 2400,
        "price_range": {"min": 1600, "max": 4000},
        "agent_fee_percent": 2.98,
        "trend": "rising",
        "hotspots": ["Leipzig", "Dresden", "Chemnitz"],
    },
    "ST": {
        "avg_price_per_sqm": 1800,
        "price_range": {"min": 1200, "max": 3000},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Magdeburg", "Halle", "Dessau"],
    },
    "SH": {
        "avg_price_per_sqm": 3000,
        "price_range": {"min": 2000, "max": 5500},
        "agent_fee_percent": 3.57,
        "trend": "stable",
        "hotspots": ["Kiel", "Lübeck", "Flensburg"],
    },
    "TH": {
        "avg_price_per_sqm": 1900,
        "price_range": {"min": 1300, "max": 3200},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Erfurt", "Jena", "Weimar"],
    },
}

# Price multipliers relative to apartment prices — mirrors frontend
PROPERTY_TYPE_MULTIPLIERS: dict[str, float] = {
    "apartment": 1.0,
    "house": 1.3,
    "multi_family": 1.5,
    "commercial": 1.4,
    "land": 0.4,
}


def compute_market_insights(
    property_location: str | None,
    property_type: str | None,
    budget_euros: int | None,
    property_goals: dict | None,
) -> dict | None:
    """Compute market insights from static data.

    Returns a dict suitable for storing in Journey.market_insights, or None
    when the location is unrecognised (e.g. a free-text city name that is not
    a two-letter state code).

    The computation mirrors the logic in the frontend MarketInsights component
    so both surfaces show identical numbers.
    """
    if not property_location:
        return None

    state_data = MARKET_DATA_BY_STATE.get(property_location)
    state_info = GERMAN_STATES.get(property_location)
    if not state_data or not state_info:
        return None

    # Prefer the property type from goals (user may have refined it in Step 1)
    goals = property_goals or {}
    effective_type = (
        goals.get("preferred_property_type") or property_type or "apartment"
    )

    multiplier = PROPERTY_TYPE_MULTIPLIERS.get(effective_type, 1.0)

    avg_price = state_data["avg_price_per_sqm"]
    adjusted_avg = round(avg_price * multiplier)
    adjusted_min = round(state_data["price_range"]["min"] * multiplier)
    adjusted_max = round(state_data["price_range"]["max"] * multiplier)

    estimated_sqm: int | None = None
    if budget_euros and adjusted_avg > 0:
        estimated_sqm = round(budget_euros / adjusted_avg)

    return {
        "state_code": property_location,
        "state_name": state_info["name"],
        "avg_price_per_sqm": avg_price,
        "price_range_min": state_data["price_range"]["min"],
        "price_range_max": state_data["price_range"]["max"],
        "agent_fee_percent": state_data["agent_fee_percent"],
        "trend": state_data["trend"],
        "hotspots": state_data["hotspots"],
        "transfer_tax_rate": state_info["transfer_tax_rate"],
        "property_type": effective_type,
        "type_multiplier": multiplier,
        "adjusted_avg_price_per_sqm": adjusted_avg,
        "adjusted_min_price_per_sqm": adjusted_min,
        "adjusted_max_price_per_sqm": adjusted_max,
        "estimated_size_sqm": estimated_sqm,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
