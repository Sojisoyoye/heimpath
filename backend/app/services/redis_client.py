"""Shared Redis client with fail-fast semantics for staging/production.

Returns a real Redis connection when available.  In ``local`` environments only,
falls back to an in-memory ``fakeredis`` implementation when Redis is
unreachable.  In staging/production, a missing Redis connection raises
``RuntimeError`` immediately — using per-process in-memory state in
multi-replica deployments would silently break token blacklisting and rate
limiting.

Post-initialisation liveness: once a real client is cached, redis-py's
connection pool handles reconnects transparently.  Callers that perform
Redis operations (auth_service, rate_limit_service, etc.) are responsible for
catching ``redis.RedisError`` on individual commands if they need to degrade
gracefully.  The ``/api/v1/utils/health-check/redis/`` endpoint can be used
to probe ongoing connectivity.
"""

import logging

import fakeredis
import redis as redis_lib

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: redis_lib.Redis | None = None


def get_redis() -> redis_lib.Redis:
    """Return a Redis-compatible client; raise RuntimeError in non-local envs if unreachable."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        client = redis_lib.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=0.5,
            socket_connect_timeout=0.5,
        )
        # ping() forces the first actual connection attempt so we fail fast at
        # initialisation time rather than on the first Redis operation.
        client.ping()
        _redis_client = client
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
        _redis_client = fakeredis.FakeRedis(decode_responses=True)

    return _redis_client
