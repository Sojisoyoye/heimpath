"""Shared fixtures for the reliability test suite.

All tests in this directory mock DB and external service interactions.
A minimal FastAPI app is provided for middleware-level tests so they
are fully isolated from the real application database.
"""

import pytest
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

# ── DB override ───────────────────────────────────────────────────────────────


@pytest.fixture(scope="session", autouse=True)
def db() -> None:
    """Override root conftest db — reliability tests mock all DB interactions."""
    yield None  # type: ignore[misc]


# ── Minimal app with reliability middlewares ──────────────────────────────────


@pytest.fixture(scope="module")
def middleware_app() -> FastAPI:
    """Minimal FastAPI app with RequestLoggingMiddleware + ContentSizeLimitMiddleware.

    Isolated from the real app so tests are independent of route changes.
    """
    from app.core.middleware import ContentSizeLimitMiddleware, RequestLoggingMiddleware

    app = FastAPI()
    # LIFO registration: ContentSizeLimit is innermost, RequestLogging is outermost
    app.add_middleware(ContentSizeLimitMiddleware)
    app.add_middleware(RequestLoggingMiddleware)

    @app.get("/ping")
    def ping() -> dict:
        return {"status": "ok"}

    @app.post("/json-echo")
    async def json_echo(request: Request) -> dict:  # noqa: ARG001
        return {"received": True}

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("intentional failure")

    return app


@pytest.fixture(scope="module")
def middleware_client(middleware_app: FastAPI) -> TestClient:
    """TestClient wrapping the minimal reliability-middleware app."""
    with TestClient(middleware_app, raise_server_exceptions=False) as c:
        yield c  # type: ignore[misc]


# ── Global-exception-handler app ─────────────────────────────────────────────


@pytest.fixture(scope="module")
def exception_handler_app() -> FastAPI:
    """App with the global exception handler registered for handler tests."""
    import uuid as _uuid

    app = FastAPI()

    @app.exception_handler(Exception)
    async def global_exception_handler(
        request: Request,
        exc: Exception,  # noqa: ARG001
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(_uuid.uuid4()))
        return JSONResponse(
            status_code=500,
            content={
                "detail": "An unexpected error occurred. Please try again.",
                "request_id": request_id,
            },
        )

    @app.get("/trigger-500")
    def trigger() -> None:
        raise ValueError("deliberate 500")

    return app


@pytest.fixture(scope="module")
def exception_client(exception_handler_app: FastAPI) -> TestClient:
    with TestClient(exception_handler_app, raise_server_exceptions=False) as c:
        yield c  # type: ignore[misc]
