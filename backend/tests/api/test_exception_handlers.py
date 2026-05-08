"""Tests for global FastAPI exception handlers."""

import uuid
from collections.abc import Generator
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError
from sqlmodel import Session

from app.api.deps import get_db
from app.core.config import settings
from app.main import app


@pytest.fixture
def client_no_raise() -> Generator[TestClient, None, None]:
    """TestClient that does not propagate server-side exceptions to the test process."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def _runtime_db() -> Generator[Session, None, None]:
    """Session whose exec() raises an unhandled RuntimeError."""
    session = MagicMock(spec=Session)
    session.exec.side_effect = RuntimeError("unexpected server error")
    yield session


def _operational_error_db() -> Generator[Session, None, None]:
    """Session whose exec() raises OperationalError (DB unavailable → 503)."""
    session = MagicMock(spec=Session)
    session.exec.side_effect = OperationalError("DB down", None, Exception("DB down"))
    yield session


@pytest.fixture
def broken_runtime_client(
    client_no_raise: TestClient,
) -> Generator[TestClient, None, None]:
    """client_no_raise with the DB overridden to raise RuntimeError."""
    app.dependency_overrides[get_db] = _runtime_db
    yield client_no_raise
    app.dependency_overrides.pop(get_db)


@pytest.fixture
def broken_operational_client(client: TestClient) -> Generator[TestClient, None, None]:
    """client with the DB overridden to raise OperationalError → HTTPException 503."""
    app.dependency_overrides[get_db] = _operational_error_db
    yield client
    app.dependency_overrides.pop(get_db)


# ── Unhandled Exception (500) ──────────────────────────────────────────────────


def test_unhandled_exception_returns_500(broken_runtime_client: TestClient) -> None:
    """Unhandled server errors return HTTP 500."""
    response = broken_runtime_client.get(f"{settings.API_V1_STR}/utils/health-check/")
    assert response.status_code == 500


def test_unhandled_exception_body_has_detail_and_request_id(
    broken_runtime_client: TestClient,
) -> None:
    """500 response body contains a safe detail message and a request_id."""
    response = broken_runtime_client.get(f"{settings.API_V1_STR}/utils/health-check/")
    body = response.json()
    assert body["detail"] == "An unexpected error occurred. Our team has been notified."
    assert "request_id" in body


def test_unhandled_exception_request_id_is_valid_uuid(
    broken_runtime_client: TestClient,
) -> None:
    """The request_id in the 500 response is a valid UUID4."""
    response = broken_runtime_client.get(f"{settings.API_V1_STR}/utils/health-check/")
    request_id = response.json()["request_id"]
    parsed = uuid.UUID(request_id, version=4)
    assert str(parsed) == request_id


def test_unhandled_exception_captures_to_sentry(
    broken_runtime_client: TestClient,
) -> None:
    """Unhandled exceptions are forwarded to Sentry with capture_exception."""
    with patch("app.main.sentry_sdk.capture_exception") as mock_capture:
        broken_runtime_client.get(f"{settings.API_V1_STR}/utils/health-check/")
    mock_capture.assert_called_once()


def test_unhandled_exception_captures_correct_exception_to_sentry(
    broken_runtime_client: TestClient,
) -> None:
    """Sentry receives the actual raised exception, not a wrapper."""
    with patch("app.main.sentry_sdk.capture_exception") as mock_capture:
        broken_runtime_client.get(f"{settings.API_V1_STR}/utils/health-check/")
    captured_exc = mock_capture.call_args.args[0]
    assert isinstance(captured_exc, RuntimeError)


# ── HTTPException (4xx / 5xx) ─────────────────────────────────────────────────


def test_http_exception_returns_correct_status_code(
    broken_operational_client: TestClient,
) -> None:
    """HTTPExceptions raised by routes are returned with their status code."""
    response = broken_operational_client.get(
        f"{settings.API_V1_STR}/utils/health-check/"
    )
    assert response.status_code == 503


def test_http_exception_body_has_detail_field(
    broken_operational_client: TestClient,
) -> None:
    """HTTPException responses contain a 'detail' string field."""
    response = broken_operational_client.get(
        f"{settings.API_V1_STR}/utils/health-check/"
    )
    body = response.json()
    assert "detail" in body
    assert isinstance(body["detail"], str)


# ── RequestValidationError (422) ──────────────────────────────────────────────


def test_validation_error_returns_422(client: TestClient) -> None:
    """Missing required form fields trigger a 422 validation error."""
    # POST to the OAuth2 form-based login endpoint without any fields
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={},
    )
    assert response.status_code == 422


def test_validation_error_body_has_detail_list(client: TestClient) -> None:
    """422 responses contain a 'detail' field that is a list of errors."""
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={},
    )
    body = response.json()
    assert "detail" in body
    assert isinstance(body["detail"], list)
    assert len(body["detail"]) > 0
