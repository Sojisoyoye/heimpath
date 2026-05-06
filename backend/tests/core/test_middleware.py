"""Tests for app.core.middleware — RequestLoggingMiddleware and ContentSizeLimitMiddleware."""

import asyncio
from unittest.mock import patch

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.testclient import TestClient

from app.core.middleware import ContentSizeLimitMiddleware, RequestLoggingMiddleware

# ── helpers ───────────────────────────────────────────────────────────────────


def _ok_app():
    """Minimal Starlette app that handles GET and POST at '/'."""

    async def homepage(_request: Request) -> JSONResponse:
        return JSONResponse({"status": "ok"})

    return Starlette(routes=[Route("/", homepage, methods=["GET", "POST"])])


def _state_app():
    """App that echoes scope state request_id back in the response body."""

    async def homepage(request: Request) -> JSONResponse:
        return JSONResponse({"request_id": getattr(request.state, "request_id", None)})

    return Starlette(routes=[Route("/", homepage)])


# ── RequestLoggingMiddleware ──────────────────────────────────────────────────


class TestRequestLoggingMiddleware:
    """Response must carry X-Request-ID; consecutive requests must have distinct IDs."""

    def test_response_has_x_request_id_header(self) -> None:
        app = RequestLoggingMiddleware(_ok_app())
        client = TestClient(app)
        response = client.get("/")
        assert "x-request-id" in response.headers

    def test_x_request_id_is_a_valid_uuid(self) -> None:
        import uuid as _uuid

        app = RequestLoggingMiddleware(_ok_app())
        client = TestClient(app)
        response = client.get("/")
        _uuid.UUID(response.headers["x-request-id"])

    def test_consecutive_requests_have_distinct_ids(self) -> None:
        app = RequestLoggingMiddleware(_ok_app())
        client = TestClient(app)
        r1 = client.get("/")
        r2 = client.get("/")
        assert r1.headers["x-request-id"] != r2.headers["x-request-id"]

    def test_request_id_set_in_scope_state(self) -> None:
        app = RequestLoggingMiddleware(_state_app())
        client = TestClient(app)
        response = client.get("/")
        body = response.json()
        assert body["request_id"] == response.headers["x-request-id"]

    def test_non_http_scope_passes_through(self) -> None:
        """Non-HTTP scopes (e.g. lifespan) must be forwarded unchanged."""
        called = []

        async def raw_app(scope, _receive, _send):
            called.append(scope["type"])

        mw = RequestLoggingMiddleware(raw_app)

        async def run():
            await mw({"type": "lifespan"}, None, None)

        asyncio.run(run())
        assert called == ["lifespan"]

    def test_logs_request_started(self) -> None:
        with patch("app.core.middleware._logger") as mock_logger:
            app = RequestLoggingMiddleware(_ok_app())
            client = TestClient(app)
            client.get("/")
        assert mock_logger.info.called
        first_call_msg = mock_logger.info.call_args_list[0].args[0]
        assert "request started" in first_call_msg

    def test_logs_request_completed(self) -> None:
        with patch("app.core.middleware._logger") as mock_logger:
            app = RequestLoggingMiddleware(_ok_app())
            client = TestClient(app)
            client.get("/")
        assert mock_logger.info.call_count >= 2
        last_call_msg = mock_logger.info.call_args_list[-1].args[0]
        assert "request completed" in last_call_msg


# ── ContentSizeLimitMiddleware ────────────────────────────────────────────────


class TestContentSizeLimitMiddleware:
    """Small JSON must pass; oversized JSON must get 413; multipart is never blocked."""

    def test_small_json_body_returns_200(self) -> None:
        inner = _ok_app()
        app = ContentSizeLimitMiddleware(inner)
        with patch("app.core.middleware.settings") as mock_settings:
            mock_settings.MAX_JSON_BODY_SIZE_BYTES = 1_048_576
            client = TestClient(app)
            response = client.post(
                "/",
                content=b'{"key":"value"}',
                headers={"Content-Type": "application/json"},
            )
        assert response.status_code == 200

    def test_oversized_json_body_returns_413(self) -> None:
        inner = _ok_app()
        app = ContentSizeLimitMiddleware(inner)
        two_mb = 2 * 1024 * 1024
        with patch("app.core.middleware.settings") as mock_settings:
            mock_settings.MAX_JSON_BODY_SIZE_BYTES = 1024  # 1 KB limit
            client = TestClient(app, raise_server_exceptions=False)
            response = client.post(
                "/",
                content=b"x" * two_mb,
                headers={
                    "Content-Type": "application/json",
                    "Content-Length": str(two_mb),
                },
            )
        assert response.status_code == 413

    def test_413_response_has_json_detail(self) -> None:
        inner = _ok_app()
        app = ContentSizeLimitMiddleware(inner)
        two_mb = 2 * 1024 * 1024
        with patch("app.core.middleware.settings") as mock_settings:
            mock_settings.MAX_JSON_BODY_SIZE_BYTES = 1024
            client = TestClient(app, raise_server_exceptions=False)
            response = client.post(
                "/",
                content=b"x" * two_mb,
                headers={
                    "Content-Type": "application/json",
                    "Content-Length": str(two_mb),
                },
            )
        assert "detail" in response.json()

    def test_multipart_request_is_not_blocked(self) -> None:
        inner = _ok_app()
        app = ContentSizeLimitMiddleware(inner)
        with patch("app.core.middleware.settings") as mock_settings:
            mock_settings.MAX_JSON_BODY_SIZE_BYTES = 1  # tiny limit
            client = TestClient(app)
            response = client.post(
                "/",
                files={"file": ("f.txt", b"a" * 1000, "text/plain")},
            )
        assert response.status_code == 200

    def test_get_request_without_body_passes(self) -> None:
        inner = _ok_app()
        app = ContentSizeLimitMiddleware(inner)
        with patch("app.core.middleware.settings") as mock_settings:
            mock_settings.MAX_JSON_BODY_SIZE_BYTES = 1
            client = TestClient(app)
            response = client.get("/")
        assert response.status_code == 200

    def test_non_http_scope_passes_through(self) -> None:
        called = []

        async def raw_app(scope, _receive, _send):
            called.append(scope["type"])

        mw = ContentSizeLimitMiddleware(raw_app)

        async def run():
            await mw({"type": "lifespan"}, None, None)

        asyncio.run(run())
        assert called == ["lifespan"]

    def test_invalid_content_length_header_does_not_raise(self) -> None:
        inner = _ok_app()
        app = ContentSizeLimitMiddleware(inner)
        with patch("app.core.middleware.settings") as mock_settings:
            mock_settings.MAX_JSON_BODY_SIZE_BYTES = 1024
            client = TestClient(app)
            response = client.post(
                "/",
                content=b'{"key":"value"}',
                headers={
                    "Content-Type": "application/json",
                    "Content-Length": "not-a-number",
                },
            )
        assert response.status_code == 200
