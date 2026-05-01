"""Tests for /api/v1/utils endpoints."""

from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.core.config import settings


def test_health_check_returns_true(client: TestClient) -> None:
    """Health check returns 200 + True when DB is reachable."""
    response = client.get(f"{settings.API_V1_STR}/utils/health-check/")
    assert response.status_code == 200
    assert response.json() is True


def test_health_check_returns_503_when_db_unavailable(client: TestClient) -> None:
    """Health check returns 503 when the DB is unreachable."""
    with patch("app.api.routes.utils.Session.exec") as mock_exec:
        mock_exec.side_effect = OperationalError("DB down", None, None)
        response = client.get(f"{settings.API_V1_STR}/utils/health-check/")
    assert response.status_code == 503
    assert "Database unavailable" in response.json()["detail"]
