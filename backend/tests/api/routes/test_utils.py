"""Tests for /api/v1/utils endpoints."""

from collections.abc import Generator
from unittest.mock import MagicMock, patch

import redis as redis_lib
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError
from sqlmodel import Session

from app.api.deps import get_db
from app.core.config import settings
from app.main import app


def test_health_check_returns_true(client: TestClient) -> None:
    """Health check returns 200 + True when DB is reachable."""
    response = client.get(f"{settings.API_V1_STR}/utils/health-check/")
    assert response.status_code == 200
    assert response.json() is True


def test_health_check_returns_503_when_db_unavailable(client: TestClient) -> None:
    """Health check returns 503 when the DB raises a SQLAlchemy error."""

    def broken_db() -> Generator[Session, None, None]:
        session = MagicMock(spec=Session)
        session.exec.side_effect = OperationalError(
            "DB down", None, Exception("DB down")
        )
        yield session

    app.dependency_overrides[get_db] = broken_db
    try:
        response = client.get(f"{settings.API_V1_STR}/utils/health-check/")
    finally:
        app.dependency_overrides.pop(get_db)

    assert response.status_code == 503
    assert "Database unavailable" in response.json()["detail"]


def test_redis_health_check_returns_true(
    client: TestClient, superuser_token_headers: dict
) -> None:
    """Redis health check returns 200 + True when Redis is reachable."""
    fake_redis = MagicMock()
    fake_redis.ping.return_value = True

    with patch("app.api.routes.utils.get_redis", return_value=fake_redis):
        response = client.get(
            f"{settings.API_V1_STR}/utils/health-check/redis/",
            headers=superuser_token_headers,
        )

    assert response.status_code == 200
    assert response.json() is True


def test_redis_health_check_returns_503_when_redis_unavailable(
    client: TestClient, superuser_token_headers: dict
) -> None:
    """Redis health check returns 503 when Redis raises RuntimeError."""
    with patch(
        "app.api.routes.utils.get_redis",
        side_effect=RuntimeError("Redis unavailable at redis://localhost in staging"),
    ):
        response = client.get(
            f"{settings.API_V1_STR}/utils/health-check/redis/",
            headers=superuser_token_headers,
        )

    assert response.status_code == 503
    assert "Redis unavailable" in response.json()["detail"]


def test_redis_health_check_returns_503_on_redis_error(
    client: TestClient, superuser_token_headers: dict
) -> None:
    """Redis health check returns 503 when ping raises a RedisError."""
    fake_redis = MagicMock()
    fake_redis.ping.side_effect = redis_lib.ConnectionError("connection refused")

    with patch("app.api.routes.utils.get_redis", return_value=fake_redis):
        response = client.get(
            f"{settings.API_V1_STR}/utils/health-check/redis/",
            headers=superuser_token_headers,
        )

    assert response.status_code == 503
    assert "Redis unavailable" in response.json()["detail"]


def test_redis_health_check_requires_authentication(client: TestClient) -> None:
    """Redis health check returns 401 without authentication."""
    response = client.get(f"{settings.API_V1_STR}/utils/health-check/redis/")
    assert response.status_code == 401


def test_circuit_breaker_health_check_returns_all_breakers(
    client: TestClient, superuser_token_headers: dict
) -> None:
    """Circuit breaker health check returns state for all four breakers."""
    response = client.get(
        f"{settings.API_V1_STR}/utils/health-check/circuit-breakers/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"stripe", "translator", "anthropic", "redis"}
    for name in ("stripe", "translator", "anthropic", "redis"):
        assert "state" in body[name]
        assert "fail_counter" in body[name]
        assert "fail_max" in body[name]
        assert body[name]["state"] in {"closed", "open", "half-open"}


def test_circuit_breaker_health_check_requires_authentication(
    client: TestClient,
) -> None:
    """Circuit breaker health check returns 401 without authentication."""
    response = client.get(f"{settings.API_V1_STR}/utils/health-check/circuit-breakers/")
    assert response.status_code == 401


def test_db_pool_stats_returns_pool_info(
    client: TestClient, superuser_token_headers: dict
) -> None:
    """DB pool stats endpoint returns the expected integer fields."""
    response = client.get(
        f"{settings.API_V1_STR}/utils/db-pool-stats/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {
        "pool_size",
        "max_overflow",
        "effective_max_per_worker",
        "checked_out",
        "checked_in",
        "overflow",
    }
    for key, value in body.items():
        assert isinstance(value, int), f"{key} should be int, got {type(value)}"
    assert body["effective_max_per_worker"] == body["pool_size"] + body["max_overflow"]


def test_db_pool_stats_requires_authentication(client: TestClient) -> None:
    """DB pool stats endpoint returns 401 without authentication."""
    response = client.get(f"{settings.API_V1_STR}/utils/db-pool-stats/")
    assert response.status_code == 401


# ── Pool exhaustion graceful degradation ─────────────────────────────────────


def test_health_check_returns_503_with_retry_after_when_pool_exhausted(
    client: TestClient,
) -> None:
    """Health check returns 503 + Retry-After when DB pool is exhausted."""

    def exhausted_db() -> Generator[Session, None, None]:
        raise HTTPException(
            status_code=503,
            detail="Service temporarily unavailable — please retry in a moment",
            headers={"Retry-After": str(settings.POOL_EXHAUSTION_BACKOFF_SECONDS)},
        )
        yield  # pragma: no cover

    app.dependency_overrides[get_db] = exhausted_db
    try:
        response = client.get(f"{settings.API_V1_STR}/utils/health-check/")
    finally:
        app.dependency_overrides.pop(get_db)

    assert response.status_code == 503
    assert response.headers.get("retry-after") == str(
        settings.POOL_EXHAUSTION_BACKOFF_SECONDS
    )


def test_health_check_returns_503_immediately_when_pool_stats_show_exhaustion(
    client: TestClient,
) -> None:
    """Health check fast-fails 503 when pool pre-check shows all slots occupied."""
    saturated = {
        "pool_size": 3,
        "max_overflow": 5,
        "effective_max_per_worker": 8,
        "checked_out": 8,
        "checked_in": 0,
        "overflow": 5,
    }
    with patch("app.api.deps.get_pool_stats", return_value=saturated):
        response = client.get(f"{settings.API_V1_STR}/utils/health-check/")

    assert response.status_code == 503
    assert response.headers.get("retry-after") == str(
        settings.POOL_EXHAUSTION_BACKOFF_SECONDS
    )


def test_health_check_503_detail_message_on_pool_exhaustion(
    client: TestClient,
) -> None:
    """503 from pool exhaustion includes a user-friendly detail message."""
    saturated = {
        "pool_size": 3,
        "max_overflow": 5,
        "effective_max_per_worker": 8,
        "checked_out": 8,
        "checked_in": 0,
        "overflow": 5,
    }
    with patch("app.api.deps.get_pool_stats", return_value=saturated):
        response = client.get(f"{settings.API_V1_STR}/utils/health-check/")

    assert "retry" in response.json()["detail"].lower()
