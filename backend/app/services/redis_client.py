"""Shared Redis client with fail-fast semantics for staging/production.

Returns a real Redis connection when available.  In ``local`` environments only,
falls back to an in-memory ``fakeredis`` implementation when Redis is
unreachable.  In staging/production, a missing Redis connection raises
``RuntimeError`` immediately — using per-process in-memory state in
multi-replica deployments would silently break token blacklisting and rate
limiting.
"""

import logging

import fakeredis
import redis as redis_lib

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: redis_lib.Redis | None = None


def get_redis() -> redis_lib.Redis:
    """Return a Redis-compatible client; raise RuntimeError in non-local envs if unreachable."""
    global _client
    if _client is not None:
        return _client

    try:
        client = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
        client.ping()
        _client = client
    except (redis_lib.RedisError, OSError) as exc:
        if settings.ENVIRONMENT != "local":
            raise RuntimeError(
                f"Redis unavailable at {settings.REDIS_URL} in "
                f"{settings.ENVIRONMENT} environment. "
                "Token blacklisting and rate limiting require Redis in "
                "multi-replica deployments."
            ) from exc
        logger.warning(
            "Redis unavailable at %s — using in-memory fallback. "
            "Rate limits and tokens will not survive restarts.",
            settings.REDIS_URL,
        )
        _client = fakeredis.FakeRedis(decode_responses=True)

    return _client
