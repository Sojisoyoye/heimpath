"""Shared Redis client with in-memory fallback.

Returns a real Redis connection when available, or a ``fakeredis``
in-memory implementation when Redis is unreachable.  This allows
staging environments (where Redis may not be provisioned) to function
with degraded — but not broken — auth flows.
"""

import logging

import fakeredis
import redis as redis_lib

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: redis_lib.Redis | None = None


def get_redis() -> redis_lib.Redis:
    """Return a Redis-compatible client, falling back to in-memory."""
    global _client
    if _client is not None:
        return _client

    try:
        client = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
        client.ping()
        _client = client
    except (redis_lib.RedisError, OSError):
        logger.warning(
            "Redis unavailable at %s — using in-memory fallback. "
            "Rate limits and tokens will not survive restarts.",
            settings.REDIS_URL,
        )
        _client = fakeredis.FakeRedis(decode_responses=True)

    return _client
