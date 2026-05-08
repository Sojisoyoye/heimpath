"""Tests for the JSON request body size limit middleware."""

import logging
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings

_ORIGINAL_MAX_BYTES = settings.MAX_JSON_BODY_SIZE_BYTES
_TEST_LIMIT = 100  # bytes — small value to avoid sending 1 MB in tests


@pytest.fixture
def small_limit(client: TestClient) -> Generator[TestClient, None, None]:
    """Temporarily reduce MAX_JSON_BODY_SIZE_BYTES to 100 bytes.

    Uses object.__setattr__ to bypass Pydantic's validation on assignment so
    the test limit is enforced at call-time by the middleware without having to
    transmit a full 1 MB body.
    """
    object.__setattr__(settings, "MAX_JSON_BODY_SIZE_BYTES", _TEST_LIMIT)
    yield client
    object.__setattr__(settings, "MAX_JSON_BODY_SIZE_BYTES", _ORIGINAL_MAX_BYTES)


# ── Oversized body ─────────────────────────────────────────────────────────────


def test_oversized_json_body_returns_413(small_limit: TestClient) -> None:
    """Requests with Content-Length > MAX_JSON_BODY_SIZE_BYTES return HTTP 413."""
    body = b"x" * (_TEST_LIMIT + 1)
    response = small_limit.post(
        f"{settings.API_V1_STR}/login/access-token",
        content=body,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413


def test_oversized_body_logs_warning(
    small_limit: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    """Oversized requests are logged at WARNING level with size and path info."""
    body = b"x" * (_TEST_LIMIT + 1)
    with caplog.at_level(logging.WARNING, logger="app.main"):
        small_limit.post(
            f"{settings.API_V1_STR}/login/access-token",
            content=body,
            headers={"Content-Type": "application/json"},
        )
    assert any("body too large" in record.message for record in caplog.records)


def test_oversized_body_response_has_detail(small_limit: TestClient) -> None:
    """413 response body contains a 'detail' field."""
    body = b"x" * (_TEST_LIMIT + 1)
    response = small_limit.post(
        f"{settings.API_V1_STR}/login/access-token",
        content=body,
        headers={"Content-Type": "application/json"},
    )
    body_json = response.json()
    assert "detail" in body_json
    assert isinstance(body_json["detail"], str)


# ── Body at or under the limit ────────────────────────────────────────────────


def test_body_exactly_at_limit_is_not_blocked(small_limit: TestClient) -> None:
    """Requests with Content-Length exactly equal to the limit are not rejected."""
    # Strictly greater-than check — at-limit should pass (result: 422 not 413)
    body = b"x" * _TEST_LIMIT
    response = small_limit.post(
        f"{settings.API_V1_STR}/login/access-token",
        content=body,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code != 413


def test_normal_request_is_not_blocked(client: TestClient) -> None:
    """Normal requests well under the limit pass through without issue."""
    response = client.get(f"{settings.API_V1_STR}/utils/health-check/")
    assert response.status_code == 200


# ── Multipart exemption ────────────────────────────────────────────────────────


def test_multipart_request_exempt_from_body_size_limit(small_limit: TestClient) -> None:
    """Multipart requests are exempt even when body exceeds the JSON limit."""
    # 200 bytes of multipart content exceeds the 100-byte test limit, but the
    # middleware exempts multipart/form-data — the response should not be 413.
    response = small_limit.post(
        f"{settings.API_V1_STR}/login/access-token",
        files={"file": ("test.txt", b"x" * (_TEST_LIMIT * 2), "text/plain")},
    )
    assert response.status_code != 413
