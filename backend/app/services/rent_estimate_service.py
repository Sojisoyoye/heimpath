"""Rent estimate service using Mietspiegel data.

Provides postcode-based rent estimates for German cities with state-level
fallback.  City-level data covers 9 major cities; all other postcodes
fall back to the state average from MARKET_DATA_BY_STATE.
"""

from __future__ import annotations

from app.services.market_data import MARKET_DATA_BY_STATE

# ---------------------------------------------------------------------------
# Postcode prefix → state code (2-digit prefix mapping for all 16 states)
# ---------------------------------------------------------------------------

POSTCODE_PREFIX_TO_STATE: dict[str, str] = {
    "01": "SN",
    "02": "SN",
    "03": "BB",
    "04": "SN",
    "06": "ST",
    "07": "TH",
    "08": "SN",
    "09": "BY",
    "10": "BE",
    "11": "BE",
    "12": "BE",
    "13": "BE",
    "14": "BB",
    "15": "BB",
    "16": "BB",
    "17": "MV",
    "18": "MV",
    "19": "MV",
    "20": "HH",
    "21": "NI",
    "22": "HH",
    "23": "SH",
    "24": "SH",
    "25": "SH",
    "26": "NI",
    "27": "NI",
    "28": "HB",
    "29": "NI",
    "30": "NI",
    "31": "NI",
    "32": "NW",
    "33": "NW",
    "34": "HE",
    "35": "HE",
    "36": "HE",
    "37": "NI",
    "38": "NI",
    "39": "ST",
    "40": "NW",
    "41": "NW",
    "42": "NW",
    "44": "NW",
    "45": "NW",
    "46": "NW",
    "47": "NW",
    "48": "NW",
    "49": "NI",
    "50": "NW",
    "51": "NW",
    "52": "NW",
    "53": "NW",
    "54": "RP",
    "55": "RP",
    "56": "RP",
    "57": "NW",
    "58": "NW",
    "59": "NW",
    "60": "HE",
    "61": "HE",
    "63": "HE",
    "64": "HE",
    "65": "HE",
    "66": "SL",
    "67": "RP",
    "68": "BW",
    "69": "BW",
    "70": "BW",
    "71": "BW",
    "72": "BW",
    "73": "BW",
    "74": "BW",
    "75": "BW",
    "76": "BW",
    "77": "BW",
    "78": "BW",
    "79": "BW",
    "80": "BY",
    "81": "BY",
    "82": "BY",
    "83": "BY",
    "84": "BY",
    "85": "BY",
    "86": "BY",
    "87": "BY",
    "88": "BW",
    "89": "BW",
    "90": "BY",
    "91": "BY",
    "92": "BY",
    "93": "BY",
    "94": "BY",
    "95": "BY",
    "96": "BY",
    "97": "BY",
    "98": "TH",
    "99": "TH",
}

# ---------------------------------------------------------------------------
# City postcode ranges for 9 major cities
# ---------------------------------------------------------------------------

CITY_POSTCODE_RANGES: list[tuple[int, int, str]] = [
    (10115, 14199, "Berlin"),
    (80331, 81929, "Munich"),
    (20095, 22769, "Hamburg"),
    (60306, 60599, "Frankfurt"),
    (50667, 51149, "Cologne"),
    (40210, 40629, "Düsseldorf"),
    (70173, 70619, "Stuttgart"),
    (4103, 4357, "Leipzig"),  # 04103–04357; no leading zeros in Python int literals
    (1067, 1328, "Dresden"),  # 01067–01328
]

# ---------------------------------------------------------------------------
# City-level Mietspiegel data (€/m², 2024 estimates)
# ---------------------------------------------------------------------------

CITY_MIETSPIEGEL: dict[str, dict] = {
    "Berlin": {
        "avg_rent_per_sqm": 13.5,
        "rent_range": {"min": 10.0, "max": 17.0},
        "state_code": "BE",
        "building_year_adjustments": {
            "pre_1918": -0.8,
            "1919_1949": -0.5,
            "1950_1977": -0.3,
            "1978_1990": 0.0,
            "1991_2002": 0.5,
            "2003_2013": 1.0,
            "post_2014": 1.5,
        },
    },
    "Munich": {
        "avg_rent_per_sqm": 19.5,
        "rent_range": {"min": 14.0, "max": 25.0},
        "state_code": "BY",
        "building_year_adjustments": {
            "pre_1918": -1.0,
            "1919_1949": -0.7,
            "1950_1977": -0.4,
            "1978_1990": 0.0,
            "1991_2002": 0.8,
            "2003_2013": 1.5,
            "post_2014": 2.5,
        },
    },
    "Hamburg": {
        "avg_rent_per_sqm": 14.0,
        "rent_range": {"min": 10.0, "max": 18.0},
        "state_code": "HH",
        "building_year_adjustments": {
            "pre_1918": -0.7,
            "1919_1949": -0.5,
            "1950_1977": -0.3,
            "1978_1990": 0.0,
            "1991_2002": 0.5,
            "2003_2013": 1.0,
            "post_2014": 1.8,
        },
    },
    "Frankfurt": {
        "avg_rent_per_sqm": 15.0,
        "rent_range": {"min": 11.0, "max": 20.0},
        "state_code": "HE",
        "building_year_adjustments": {
            "pre_1918": -0.8,
            "1919_1949": -0.5,
            "1950_1977": -0.3,
            "1978_1990": 0.0,
            "1991_2002": 0.6,
            "2003_2013": 1.2,
            "post_2014": 2.0,
        },
    },
    "Cologne": {
        "avg_rent_per_sqm": 12.5,
        "rent_range": {"min": 9.0, "max": 16.0},
        "state_code": "NW",
        "building_year_adjustments": {
            "pre_1918": -0.6,
            "1919_1949": -0.4,
            "1950_1977": -0.2,
            "1978_1990": 0.0,
            "1991_2002": 0.4,
            "2003_2013": 0.8,
            "post_2014": 1.5,
        },
    },
    "Düsseldorf": {
        "avg_rent_per_sqm": 12.0,
        "rent_range": {"min": 8.5, "max": 16.0},
        "state_code": "NW",
        "building_year_adjustments": {
            "pre_1918": -0.6,
            "1919_1949": -0.4,
            "1950_1977": -0.2,
            "1978_1990": 0.0,
            "1991_2002": 0.4,
            "2003_2013": 0.9,
            "post_2014": 1.5,
        },
    },
    "Stuttgart": {
        "avg_rent_per_sqm": 14.5,
        "rent_range": {"min": 10.5, "max": 19.0},
        "state_code": "BW",
        "building_year_adjustments": {
            "pre_1918": -0.7,
            "1919_1949": -0.5,
            "1950_1977": -0.3,
            "1978_1990": 0.0,
            "1991_2002": 0.5,
            "2003_2013": 1.0,
            "post_2014": 1.8,
        },
    },
    "Leipzig": {
        "avg_rent_per_sqm": 8.0,
        "rent_range": {"min": 6.0, "max": 11.0},
        "state_code": "SN",
        "building_year_adjustments": {
            "pre_1918": -0.5,
            "1919_1949": -0.3,
            "1950_1977": -0.2,
            "1978_1990": 0.0,
            "1991_2002": 0.3,
            "2003_2013": 0.6,
            "post_2014": 1.0,
        },
    },
    "Dresden": {
        "avg_rent_per_sqm": 8.5,
        "rent_range": {"min": 6.0, "max": 11.5},
        "state_code": "SN",
        "building_year_adjustments": {
            "pre_1918": -0.5,
            "1919_1949": -0.3,
            "1950_1977": -0.2,
            "1978_1990": 0.0,
            "1991_2002": 0.3,
            "2003_2013": 0.7,
            "post_2014": 1.0,
        },
    },
}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def _get_building_year_bracket(year: int) -> str:
    """Map a building year to its bracket key."""
    if year < 1919:
        return "pre_1918"
    if year <= 1949:
        return "1919_1949"
    if year <= 1977:
        return "1950_1977"
    if year <= 1990:
        return "1978_1990"
    if year <= 2002:
        return "1991_2002"
    if year <= 2013:
        return "2003_2013"
    return "post_2014"


def _find_city(postcode: str) -> str | None:
    """Return city name if postcode falls within a known city range."""
    postcode_int = int(postcode)
    for start, end, city in CITY_POSTCODE_RANGES:
        if start <= postcode_int <= end:
            return city
    return None


def _postcode_to_state(postcode: str) -> str | None:
    """Return state code for a postcode's 2-digit prefix."""
    prefix = postcode[:2]
    return POSTCODE_PREFIX_TO_STATE.get(prefix)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def estimate_rent(
    postcode: str,
    size_sqm: float | None = None,
    building_year: int | None = None,
) -> dict:
    """Estimate rent for a German postcode.

    Returns a dict with estimated_rent_per_sqm, rent_range, source,
    confidence, city (if applicable), state_code, and monthly_rent
    (when size_sqm is provided).
    """
    city = _find_city(postcode)
    state_code = _postcode_to_state(postcode)

    if city and city in CITY_MIETSPIEGEL:
        data = CITY_MIETSPIEGEL[city]
        base_rent = data["avg_rent_per_sqm"]
        rent_range = data["rent_range"]
        source = f"Mietspiegel {city}"
        confidence = "high"

        # Apply building year adjustment
        adjustment = 0.0
        if building_year is not None:
            bracket = _get_building_year_bracket(building_year)
            adjustment = data["building_year_adjustments"].get(bracket, 0.0)

        estimated_rent = round(base_rent + adjustment, 2)
    elif state_code and state_code in MARKET_DATA_BY_STATE:
        state_data = MARKET_DATA_BY_STATE[state_code]
        estimated_rent = state_data["avg_rent_per_sqm"]
        rent_range = state_data["rent_range"]
        source = f"State average ({state_code})"
        confidence = "medium"
        city = None
    else:
        return {
            "estimated_rent_per_sqm": None,
            "rent_range": None,
            "source": None,
            "confidence": "low",
            "city": None,
            "state_code": state_code,
            "monthly_rent": None,
        }

    monthly_rent = round(estimated_rent * size_sqm) if size_sqm else None

    return {
        "estimated_rent_per_sqm": estimated_rent,
        "rent_range": rent_range,
        "source": source,
        "confidence": confidence,
        "city": city,
        "state_code": state_code,
        "monthly_rent": monthly_rent,
    }
