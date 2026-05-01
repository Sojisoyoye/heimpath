"""Tests for /api/v1/utils endpoints."""

from collections.abc import Generator
from unittest.mock import MagicMock

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
        session.exec.side_effect = OperationalError("DB down", None, Exception("DB down"))
        yield session

    app.dependency_overrides[get_db] = broken_db
    try:
        response = client.get(f"{settings.API_V1_STR}/utils/health-check/")
    finally:
        app.dependency_overrides.pop(get_db)

    assert response.status_code == 503
    assert "Database unavailable" in response.json()["detail"]
