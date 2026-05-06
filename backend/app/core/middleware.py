"""ASGI middleware for request logging and body size limiting.

Two middlewares:
- RequestLoggingMiddleware  — attaches a UUID request-id to every request,
  logs start/completion with elapsed_ms, and echoes the id in the response
  header ``X-Request-ID``.
- ContentSizeLimitMiddleware — rejects ``application/json`` requests whose
  ``Content-Length`` header exceeds ``settings.MAX_JSON_BODY_SIZE_BYTES``.
  Multipart requests and requests without a body are never blocked.
"""

import logging
import time
import uuid

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
        if "state" not in scope or not isinstance(scope["state"], State):
            scope["state"] = State()
        scope["state"].request_id = request_id

        path = scope.get("path", "")
        method = scope.get("method", "")
        _logger.info("request started method=%s path=%s request_id=%s", method, path, request_id)
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
