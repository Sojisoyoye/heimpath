"""Market data constants and computation for Step 2: Market Insights.

This module provides static German real estate market data and a function to
compute personalised market insights for a journey based on location, property
type, and budget.  The data mirrors the constants used in the frontend
(frontend/src/common/constants/propertyGoals.ts and index.ts) so that the
backend and frontend are always in sync.
"""

from datetime import datetime, timezone
from typing import Any

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
        "avg_rent_per_sqm": 10.5,
        "rent_range": {"min": 7.5, "max": 14.0},
        "agent_fee_percent": 3.57,
        "trend": "stable",
        "hotspots": ["Stuttgart", "Freiburg", "Karlsruhe"],
    },
    "BY": {
        "avg_price_per_sqm": 4500,
        "price_range": {"min": 2800, "max": 9000},
        "avg_rent_per_sqm": 12.0,
        "rent_range": {"min": 8.0, "max": 18.0},
        "agent_fee_percent": 3.57,
        "trend": "stable",
        "hotspots": ["Munich", "Nuremberg", "Augsburg"],
    },
    "BE": {
        "avg_price_per_sqm": 5200,
        "price_range": {"min": 3500, "max": 8000},
        "avg_rent_per_sqm": 13.5,
        "rent_range": {"min": 10.0, "max": 17.0},
        "agent_fee_percent": 3.57,
        "trend": "rising",
        "hotspots": ["Mitte", "Prenzlauer Berg", "Kreuzberg"],
    },
    "BB": {
        "avg_price_per_sqm": 2800,
        "price_range": {"min": 1800, "max": 4500},
        "avg_rent_per_sqm": 8.0,
        "rent_range": {"min": 6.0, "max": 11.0},
        "agent_fee_percent": 3.57,
        "trend": "rising",
        "hotspots": ["Potsdam", "Cottbus", "Brandenburg an der Havel"],
    },
    "HB": {
        "avg_price_per_sqm": 2900,
        "price_range": {"min": 2000, "max": 4500},
        "avg_rent_per_sqm": 8.5,
        "rent_range": {"min": 6.5, "max": 11.0},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Bremen-Mitte", "Schwachhausen", "Horn-Lehe"],
    },
    "HH": {
        "avg_price_per_sqm": 5800,
        "price_range": {"min": 4000, "max": 10000},
        "avg_rent_per_sqm": 13.0,
        "rent_range": {"min": 9.5, "max": 17.5},
        "agent_fee_percent": 3.12,
        "trend": "stable",
        "hotspots": ["Eppendorf", "Winterhude", "Eimsbüttel"],
    },
    "HE": {
        "avg_price_per_sqm": 3600,
        "price_range": {"min": 2200, "max": 7000},
        "avg_rent_per_sqm": 11.0,
        "rent_range": {"min": 8.0, "max": 15.0},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Frankfurt", "Wiesbaden", "Darmstadt"],
    },
    "MV": {
        "avg_price_per_sqm": 2200,
        "price_range": {"min": 1400, "max": 4000},
        "avg_rent_per_sqm": 7.5,
        "rent_range": {"min": 5.5, "max": 10.0},
        "agent_fee_percent": 2.98,
        "trend": "rising",
        "hotspots": ["Rostock", "Schwerin", "Greifswald"],
    },
    "NI": {
        "avg_price_per_sqm": 2600,
        "price_range": {"min": 1800, "max": 4500},
        "avg_rent_per_sqm": 8.5,
        "rent_range": {"min": 6.5, "max": 11.5},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Hannover", "Braunschweig", "Oldenburg"],
    },
    "NW": {
        "avg_price_per_sqm": 3200,
        "price_range": {"min": 2000, "max": 6000},
        "avg_rent_per_sqm": 9.5,
        "rent_range": {"min": 7.0, "max": 13.5},
        "agent_fee_percent": 3.57,
        "trend": "stable",
        "hotspots": ["Düsseldorf", "Cologne", "Münster"],
    },
    "RP": {
        "avg_price_per_sqm": 2400,
        "price_range": {"min": 1600, "max": 4000},
        "avg_rent_per_sqm": 8.0,
        "rent_range": {"min": 6.0, "max": 10.5},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Mainz", "Koblenz", "Trier"],
    },
    "SL": {
        "avg_price_per_sqm": 2000,
        "price_range": {"min": 1400, "max": 3200},
        "avg_rent_per_sqm": 7.0,
        "rent_range": {"min": 5.5, "max": 9.0},
        "agent_fee_percent": 3.57,
        "trend": "stable",
        "hotspots": ["Saarbrücken", "Neunkirchen", "Homburg"],
    },
    "SN": {
        "avg_price_per_sqm": 2400,
        "price_range": {"min": 1600, "max": 4000},
        "avg_rent_per_sqm": 7.5,
        "rent_range": {"min": 5.5, "max": 10.0},
        "agent_fee_percent": 2.98,
        "trend": "rising",
        "hotspots": ["Leipzig", "Dresden", "Chemnitz"],
    },
    "ST": {
        "avg_price_per_sqm": 1800,
        "price_range": {"min": 1200, "max": 3000},
        "avg_rent_per_sqm": 6.5,
        "rent_range": {"min": 5.0, "max": 8.5},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Magdeburg", "Halle", "Dessau"],
    },
    "SH": {
        "avg_price_per_sqm": 3000,
        "price_range": {"min": 2000, "max": 5500},
        "avg_rent_per_sqm": 9.5,
        "rent_range": {"min": 7.0, "max": 12.5},
        "agent_fee_percent": 3.57,
        "trend": "stable",
        "hotspots": ["Kiel", "Lübeck", "Flensburg"],
    },
    "TH": {
        "avg_price_per_sqm": 1900,
        "price_range": {"min": 1300, "max": 3200},
        "avg_rent_per_sqm": 6.5,
        "rent_range": {"min": 5.0, "max": 8.5},
        "agent_fee_percent": 2.98,
        "trend": "stable",
        "hotspots": ["Erfurt", "Jena", "Weimar"],
    },
}

# ---------------------------------------------------------------------------
# City-level market data: per-state → per-city pricing
# Covers the hotspot cities listed in MARKET_DATA_BY_STATE.
# ---------------------------------------------------------------------------

CITY_MARKET_DATA: dict[str, dict[str, dict]] = {
    "BW": {
        "Stuttgart": {
            "avg_price_per_sqm": 4800,
            "price_range": {"min": 3200, "max": 7500},
        },
        "Freiburg": {
            "avg_price_per_sqm": 4200,
            "price_range": {"min": 2800, "max": 6500},
        },
        "Karlsruhe": {
            "avg_price_per_sqm": 3600,
            "price_range": {"min": 2400, "max": 5500},
        },
    },
    "BY": {
        "Munich": {
            "avg_price_per_sqm": 7500,
            "price_range": {"min": 5000, "max": 12000},
        },
        "Nuremberg": {
            "avg_price_per_sqm": 3800,
            "price_range": {"min": 2500, "max": 6000},
        },
        "Augsburg": {
            "avg_price_per_sqm": 3500,
            "price_range": {"min": 2300, "max": 5500},
        },
    },
    "BE": {
        "Mitte": {
            "avg_price_per_sqm": 6500,
            "price_range": {"min": 4500, "max": 10000},
        },
        "Prenzlauer Berg": {
            "avg_price_per_sqm": 5800,
            "price_range": {"min": 4000, "max": 8500},
        },
        "Kreuzberg": {
            "avg_price_per_sqm": 5500,
            "price_range": {"min": 3800, "max": 8000},
        },
    },
    "BB": {
        "Potsdam": {
            "avg_price_per_sqm": 3800,
            "price_range": {"min": 2500, "max": 6000},
        },
        "Cottbus": {
            "avg_price_per_sqm": 2200,
            "price_range": {"min": 1400, "max": 3500},
        },
        "Brandenburg an der Havel": {
            "avg_price_per_sqm": 2400,
            "price_range": {"min": 1600, "max": 3800},
        },
    },
    "HB": {
        "Bremen-Mitte": {
            "avg_price_per_sqm": 3200,
            "price_range": {"min": 2200, "max": 5000},
        },
        "Schwachhausen": {
            "avg_price_per_sqm": 3500,
            "price_range": {"min": 2400, "max": 5500},
        },
        "Horn-Lehe": {
            "avg_price_per_sqm": 3000,
            "price_range": {"min": 2000, "max": 4800},
        },
    },
    "HH": {
        "Eppendorf": {
            "avg_price_per_sqm": 7000,
            "price_range": {"min": 5000, "max": 11000},
        },
        "Winterhude": {
            "avg_price_per_sqm": 6500,
            "price_range": {"min": 4500, "max": 10000},
        },
        "Eimsbüttel": {
            "avg_price_per_sqm": 6000,
            "price_range": {"min": 4200, "max": 9500},
        },
    },
    "HE": {
        "Frankfurt": {
            "avg_price_per_sqm": 5200,
            "price_range": {"min": 3500, "max": 8500},
        },
        "Wiesbaden": {
            "avg_price_per_sqm": 4000,
            "price_range": {"min": 2800, "max": 6500},
        },
        "Darmstadt": {
            "avg_price_per_sqm": 3800,
            "price_range": {"min": 2600, "max": 6000},
        },
    },
    "MV": {
        "Rostock": {
            "avg_price_per_sqm": 2800,
            "price_range": {"min": 1800, "max": 4500},
        },
        "Schwerin": {
            "avg_price_per_sqm": 2400,
            "price_range": {"min": 1500, "max": 4000},
        },
        "Greifswald": {
            "avg_price_per_sqm": 2600,
            "price_range": {"min": 1700, "max": 4200},
        },
    },
    "NI": {
        "Hannover": {
            "avg_price_per_sqm": 3200,
            "price_range": {"min": 2200, "max": 5000},
        },
        "Braunschweig": {
            "avg_price_per_sqm": 2800,
            "price_range": {"min": 1900, "max": 4500},
        },
        "Oldenburg": {
            "avg_price_per_sqm": 2700,
            "price_range": {"min": 1800, "max": 4200},
        },
    },
    "NW": {
        "Düsseldorf": {
            "avg_price_per_sqm": 4200,
            "price_range": {"min": 2800, "max": 7000},
        },
        "Cologne": {
            "avg_price_per_sqm": 4000,
            "price_range": {"min": 2700, "max": 6500},
        },
        "Münster": {
            "avg_price_per_sqm": 3800,
            "price_range": {"min": 2500, "max": 6000},
        },
    },
    "RP": {
        "Mainz": {
            "avg_price_per_sqm": 3200,
            "price_range": {"min": 2200, "max": 5000},
        },
        "Koblenz": {
            "avg_price_per_sqm": 2600,
            "price_range": {"min": 1800, "max": 4000},
        },
        "Trier": {
            "avg_price_per_sqm": 2800,
            "price_range": {"min": 1900, "max": 4200},
        },
    },
    "SL": {
        "Saarbrücken": {
            "avg_price_per_sqm": 2200,
            "price_range": {"min": 1500, "max": 3500},
        },
        "Neunkirchen": {
            "avg_price_per_sqm": 1800,
            "price_range": {"min": 1200, "max": 2800},
        },
        "Homburg": {
            "avg_price_per_sqm": 1900,
            "price_range": {"min": 1300, "max": 3000},
        },
    },
    "SN": {
        "Leipzig": {
            "avg_price_per_sqm": 3000,
            "price_range": {"min": 2000, "max": 5000},
        },
        "Dresden": {
            "avg_price_per_sqm": 2800,
            "price_range": {"min": 1900, "max": 4500},
        },
        "Chemnitz": {
            "avg_price_per_sqm": 1800,
            "price_range": {"min": 1200, "max": 3000},
        },
    },
    "ST": {
        "Magdeburg": {
            "avg_price_per_sqm": 2000,
            "price_range": {"min": 1300, "max": 3200},
        },
        "Halle": {
            "avg_price_per_sqm": 2100,
            "price_range": {"min": 1400, "max": 3400},
        },
        "Dessau": {
            "avg_price_per_sqm": 1500,
            "price_range": {"min": 1000, "max": 2500},
        },
    },
    "SH": {
        "Kiel": {
            "avg_price_per_sqm": 3200,
            "price_range": {"min": 2200, "max": 5200},
        },
        "Lübeck": {
            "avg_price_per_sqm": 3400,
            "price_range": {"min": 2300, "max": 5500},
        },
        "Flensburg": {
            "avg_price_per_sqm": 2800,
            "price_range": {"min": 1900, "max": 4500},
        },
    },
    "TH": {
        "Erfurt": {
            "avg_price_per_sqm": 2200,
            "price_range": {"min": 1500, "max": 3500},
        },
        "Jena": {
            "avg_price_per_sqm": 2600,
            "price_range": {"min": 1800, "max": 4200},
        },
        "Weimar": {
            "avg_price_per_sqm": 2400,
            "price_range": {"min": 1600, "max": 3800},
        },
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


def _find_city_data(state_code: str, preferred_area: str | None) -> dict | None:
    """Look up city-level data for a preferred area (case-insensitive)."""
    if not preferred_area:
        return None
    cities = CITY_MARKET_DATA.get(state_code, {})
    area_lower = preferred_area.lower()
    for city_name, data in cities.items():
        if city_name.lower() == area_lower:
            return data
    return None


def compute_market_insights(
    property_location: str | None,
    property_type: str | None,
    budget_euros: int | None,
    property_goals: dict[str, Any] | None,
) -> dict[str, Any] | None:
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

    # Try city-level pricing when a preferred_area is specified
    preferred_area: str | None = goals.get("preferred_area")
    city_data = _find_city_data(property_location, preferred_area)

    if city_data:
        avg_price = city_data["avg_price_per_sqm"]
        price_min = city_data["price_range"]["min"]
        price_max = city_data["price_range"]["max"]
    else:
        avg_price = state_data["avg_price_per_sqm"]
        price_min = state_data["price_range"]["min"]
        price_max = state_data["price_range"]["max"]

    adjusted_avg = round(avg_price * multiplier)
    adjusted_min = round(price_min * multiplier)
    adjusted_max = round(price_max * multiplier)

    estimated_sqm: int | None = None
    if budget_euros and adjusted_avg > 0:
        estimated_sqm = round(budget_euros / adjusted_avg)

    return {
        "state_code": property_location,
        "state_name": state_info["name"],
        "avg_price_per_sqm": avg_price,
        "price_range_min": price_min,
        "price_range_max": price_max,
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
        "preferred_area": preferred_area,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
