"""Scheduler job execution tracking via Redis.

Stores a timestamp in Redis each time a scheduler job completes (success or
failure) so the admin health endpoint can detect silent job failures.
"""

import logging
from datetime import datetime, timezone

import redis as redis_lib

from app.services.redis_client import get_redis

logger = logging.getLogger(__name__)

_KEY_PREFIX = "scheduler:last_run:"


def record_job_run(job_name: str) -> None:
    """Write the current UTC timestamp to Redis for the given job.

    Called after each scheduler job run — regardless of success or failure —
    so the health endpoint can detect jobs that have stopped running entirely.
    Failures are swallowed and logged; Redis unavailability must not break the
    scheduler job itself.
    """
    try:
        client = get_redis()
        client.set(_KEY_PREFIX + job_name, datetime.now(timezone.utc).isoformat())
    except (redis_lib.RedisError, RuntimeError):
        logger.warning("Failed to record last run time for job '%s'", job_name)


def get_last_run(job_name: str) -> datetime | None:
    """Return the last recorded run time for a scheduler job, or None if never run.

    Redis failures are swallowed and treated as "never run" so the health
    endpoint degrades gracefully when Redis is unavailable.
    """
    try:
        client = get_redis()
        value = client.get(_KEY_PREFIX + job_name)
        if value is None:
            return None
        return datetime.fromisoformat(value)
    except (redis_lib.RedisError, RuntimeError):
        return None
