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
