"""Pydantic schemas for admin endpoints."""

from pydantic import BaseModel


class TranslatorUsageResponse(BaseModel):
    """Current-month Azure Translator character usage statistics."""

    month: str
    characters_used: int
    quota_limit: int
    percentage_used: float
    alert_threshold_pct: int
    quota_reached: bool
    alert_active: bool
    redis_available: bool


class GrowthMetricsResponse(BaseModel):
    """Real-time growth metrics for the GrowthOS dashboard."""

    signups: int
    signups_this_week: int
    activation_rate: float
    return_visit_rate: float
    feedback_count: int
    feedback_this_week: int
    journeys_started: int
    journeys_active: int
    as_of: str
