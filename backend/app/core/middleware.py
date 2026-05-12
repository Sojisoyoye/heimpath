"""ASGI middleware for request logging, body size limiting, and request timeouts.

Three middlewares:
- RequestLoggingMiddleware  — attaches a UUID request-id to every request,
  logs start/completion with elapsed_ms, and echoes the id in the response
  header ``X-Request-ID``.
- ContentSizeLimitMiddleware — rejects ``application/json`` requests whose
  ``Content-Length`` header exceeds ``settings.MAX_JSON_BODY_SIZE_BYTES``.
  Multipart requests and requests without a body are never blocked.
- RequestTimeoutMiddleware — cancels HTTP requests that exceed a configurable
  wall-clock timeout and returns HTTP 504.  Document/translation routes receive
  a longer budget.  WebSocket and lifespan scopes are unaffected.
"""

import json
import logging
import time
import uuid

import anyio
import sentry_sdk
from starlette.datastructures import MutableHeaders, State
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import settings

_logger = logging.getLogger(__name__)


class RequestLoggingMiddleware:
    """Log every HTTP request with its UUID request-id and elapsed time."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())
        if not isinstance(scope.get("state"), State):
            scope["state"] = State()
        scope["state"].request_id = request_id

        path = scope.get("path", "")
        method = scope.get("method", "")
        _logger.info(
            "request started method=%s path=%s request_id=%s", method, path, request_id
        )
        start = time.perf_counter()

        async def send_with_request_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers.append("X-Request-ID", request_id)
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            elapsed_ms = (time.perf_counter() - start) * 1000
            _logger.info(
                "request completed method=%s path=%s request_id=%s elapsed_ms=%.1f",
                method,
                path,
                request_id,
                elapsed_ms,
            )


class ContentSizeLimitMiddleware:
    """Reject application/json requests exceeding MAX_JSON_BODY_SIZE_BYTES.

    Reads the ``Content-Length`` header only — does not buffer the body.
    Multipart requests and requests without a content-type are ignored.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        content_type = headers.get(b"content-type", b"").decode("latin1").lower()
        content_length_raw = headers.get(b"content-length", b"")

        if "application/json" in content_type and content_length_raw:
            try:
                content_length = int(content_length_raw)
            except ValueError:
                content_length = 0

            if content_length > settings.MAX_JSON_BODY_SIZE_BYTES:
                _logger.warning(
                    "Request body too large: %d bytes (limit %d)",
                    content_length,
                    settings.MAX_JSON_BODY_SIZE_BYTES,
                )
                await send(
                    {
                        "type": "http.response.start",
                        "status": 413,
                        "headers": [
                            (b"content-type", b"application/json"),
                        ],
                    }
                )
                await send(
                    {
                        "type": "http.response.body",
                        "body": b'{"detail":"Request body too large"}',
                    }
                )
                return

        await self.app(scope, receive, send)


# Route path prefixes that require the extended document-processing timeout.
_LONG_TIMEOUT_PREFIXES: tuple[str, ...] = (
    "/api/v1/documents",
    "/api/v1/translations",
)

_TIMEOUT_BODY = json.dumps(
    {"detail": "Request timed out \u2014 please try again."}
).encode()


class RequestTimeoutMiddleware:
    """Cancel HTTP requests exceeding a wall-clock timeout and return HTTP 504.

    Document and translation routes receive ``document_timeout`` seconds;
    all other HTTP routes receive ``default_timeout`` seconds.
    WebSocket and lifespan scopes are passed through unchanged.

    Timeouts default to ``settings.REQUEST_TIMEOUT_SECONDS`` and
    ``settings.DOCUMENT_REQUEST_TIMEOUT_SECONDS`` but can be overridden
    per-instance (useful for testing with short values).
    """

    def __init__(
        self,
        app: ASGIApp,
        default_timeout: float | None = None,
        document_timeout: float | None = None,
    ) -> None:
        self.app = app
        self._default_timeout = (
            default_timeout
            if default_timeout is not None
            else float(settings.REQUEST_TIMEOUT_SECONDS)
        )
        self._document_timeout = (
            document_timeout
            if document_timeout is not None
            else float(settings.DOCUMENT_REQUEST_TIMEOUT_SECONDS)
        )

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")
        timeout = (
            self._document_timeout
            if any(path.startswith(p) for p in _LONG_TIMEOUT_PREFIXES)
            else self._default_timeout
        )

        response_started = False

        async def tracked_send(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        with anyio.move_on_after(timeout) as cancel_scope:
            await self.app(scope, receive, tracked_send)

        if cancel_scope.cancelled_caught:
            method: str = scope.get("method", "")
            _logger.warning(
                "Request timed out after %.1fs: method=%s path=%s",
                timeout,
                method,
                path,
            )
            with sentry_sdk.new_scope() as s_scope:
                s_scope.set_tag("path", path)
                s_scope.set_tag("timeout_seconds", str(timeout))
                sentry_sdk.capture_message(
                    f"Request timed out: {method} {path}", level="warning"
                )
            if not response_started:
                await send(
                    {
                        "type": "http.response.start",
                        "status": 504,
                        "headers": [(b"content-type", b"application/json")],
                    }
                )
                await send({"type": "http.response.body", "body": _TIMEOUT_BODY})
