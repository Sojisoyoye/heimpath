"""Validation constants for financial calculator schemas.

These bounds prevent nonsensical extreme inputs while covering realistic
German real-estate scenarios.  Mirror the numeric limits in frontend form
validation so users see consistent feedback.
"""

# Property price — largest German residential properties are ~€50–80M;
# 100M leaves headroom for ultra-premium commercial use cases.
PROPERTY_PRICE_MAX_EUR: int = 100_000_000

# Monthly rent — €100 K/month covers large commercial buildings.
MONTHLY_RENT_MAX_EUR: int = 100_000

# Monthly operating expenses upper bound.
MONTHLY_EXPENSES_MAX_EUR: int = 50_000

# Annual mortgage / interest rate — historical German peaks never
# exceeded ~15%; 30% provides a safe ceiling for stress-testing.
INTEREST_RATE_MAX_PERCENT: float = 30.0

# Property size — largest German residential buildings are well below
# 10 000 m²; this prevents division-by-zero edge cases in unit calcs.
SQUARE_METERS_MAX: int = 10_000
