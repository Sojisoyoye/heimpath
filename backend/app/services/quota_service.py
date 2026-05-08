"""Azure Translator monthly character quota metering via Redis.

Tracks translated character counts per calendar month using a Redis counter
keyed by year-month (e.g. ``translator:chars:2026-05``). The key expires
automatically at month end so no cleanup job is required.

The limit defaults to 1,900,000 characters — a 5 % buffer below the free-tier
ceiling of 2,000,000 — to absorb the slight over-counting that can occur when
the check fires and the record fires in separate operations.
"""

import calendar
import logging
from datetime import datetime, timezone

import redis as redis_lib
from fastapi import HTTPException

from app.core.config import settings
from app.services.redis_client import get_redis

logger = logging.getLogger(__name__)

_QUOTA_KEY_PREFIX = "translator:chars:"


def _monthly_key() -> str:
    """Return the Redis key for the current calendar month's character count."""
    now = datetime.now(timezone.utc)
    return f"{_QUOTA_KEY_PREFIX}{now.year}-{now.month:02d}"


def _month_end_ttl() -> int:
    """Return seconds remaining until the end of the current month (UTC)."""
    now = datetime.now(timezone.utc)
    _, last_day = calendar.monthrange(now.year, now.month)
    month_end = datetime(now.year, now.month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    return max(1, int((month_end - now).total_seconds()))


def _next_month_label() -> str:
    """Return a human-readable reset date, e.g. '1 June 2026'."""
    now = datetime.now(timezone.utc)
    if now.month == 12:
        return f"1 January {now.year + 1}"
    reset = datetime(now.year, now.month + 1, 1)
    return f"1 {reset.strftime('%B')} {now.year}"


def get_current_usage() -> int:
    """Return the total characters translated in the current calendar month.

    Returns 0 when Redis is unavailable so the caller can degrade gracefully.
    """
    try:
        value = get_redis().get(_monthly_key())
        return int(value) if value else 0
    except (redis_lib.RedisError, RuntimeError):
        logger.warning("quota_service: failed to read usage from Redis")
        return 0


def check_quota(char_count: int) -> None:  # noqa: ARG001  (kept for future use)
    """Raise HTTP 429 when the current monthly usage has reached the limit.

    The ``char_count`` argument is accepted for interface symmetry and future
    pre-check use but the gate fires on the *current* stored total, not on
    current + char_count, because the limit already includes a 5 % safety
    buffer.

    Raises:
        HTTPException(429): When monthly quota is exhausted.
    """
    try:
        current = get_current_usage()
    except Exception:
        # Fail open — do not block translations when Redis is unreachable.
        return

    if current >= settings.AZURE_TRANSLATOR_QUOTA_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Monthly translation quota reached — resets on {_next_month_label()}"
            ),
        )

    alert_limit = int(
        settings.AZURE_TRANSLATOR_QUOTA_LIMIT
        * settings.AZURE_TRANSLATOR_QUOTA_ALERT_THRESHOLD
    )
    if current >= alert_limit:
        logger.warning(
            "Azure Translator quota at %.1f%% (%d/%d chars used this month)",
            current / settings.AZURE_TRANSLATOR_QUOTA_LIMIT * 100,
            current,
            settings.AZURE_TRANSLATOR_QUOTA_LIMIT,
        )


def record_usage(char_count: int) -> None:
    """Increment the monthly character counter after a successful translation.

    The Redis key's TTL is refreshed to the end of the current month on every
    write so the counter expires automatically when the month rolls over.

    Args:
        char_count: Number of characters successfully translated.
    """
    if char_count <= 0:
        return

    try:
        client = get_redis()
        key = _monthly_key()
        new_total = client.incrby(key, char_count)
        client.expire(key, _month_end_ttl())

        # Log once when usage crosses the alert threshold.
        alert_limit = int(
            settings.AZURE_TRANSLATOR_QUOTA_LIMIT
            * settings.AZURE_TRANSLATOR_QUOTA_ALERT_THRESHOLD
        )
        prev_total = new_total - char_count
        if new_total >= alert_limit > prev_total:
            logger.warning(
                "Azure Translator quota crossed %.0f%% threshold (%d/%d chars)",
                settings.AZURE_TRANSLATOR_QUOTA_ALERT_THRESHOLD * 100,
                new_total,
                settings.AZURE_TRANSLATOR_QUOTA_LIMIT,
            )
    except (redis_lib.RedisError, RuntimeError):
        logger.warning(
            "quota_service: failed to record %d chars in Redis", char_count
        )


def get_usage_stats() -> dict:
    """Return current-month usage statistics for the admin endpoint.

    Returns:
        Dict with keys: month, characters_used, quota_limit, percentage_used,
        alert_threshold_pct, quota_reached, alert_active.
    """
    current = get_current_usage()
    limit = settings.AZURE_TRANSLATOR_QUOTA_LIMIT
    alert_threshold = settings.AZURE_TRANSLATOR_QUOTA_ALERT_THRESHOLD
    now = datetime.now(timezone.utc)
    return {
        "month": f"{now.year}-{now.month:02d}",
        "characters_used": current,
        "quota_limit": limit,
        "percentage_used": round(current / limit * 100, 1) if limit > 0 else 0.0,
        "alert_threshold_pct": int(alert_threshold * 100),
        "quota_reached": current >= limit,
        "alert_active": current >= int(limit * alert_threshold),
    }
