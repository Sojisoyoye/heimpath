import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import sentry_sdk
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.routing import APIRoute
from sqlmodel import Session
from starlette.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send

from app.api.main import api_router
from app.core.config import settings
from app.core.db import engine
from app.services.portfolio_service import generate_recurring_transactions

logger = logging.getLogger(__name__)


class _ContainerAppsProxyMiddleware:
    """Proxy header middleware for Azure Container Apps.

    Container Apps' Envoy ingress appends the real downstream client IP to the
    X-Forwarded-For chain.  Reading the rightmost entry gives the IP added by
    the trusted CAE ingress, which cannot be spoofed: even if a client injects
    values earlier in the chain, CAE always appends the real IP at the end.

    Replaces uvicorn's ProxyHeadersMiddleware (which reads the leftmost value
    and is therefore vulnerable to X-Forwarded-For spoofing when all hosts are
    trusted).
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> Any:
        if scope["type"] in ("http", "websocket"):
            headers = dict(scope["headers"])

            if b"x-forwarded-for" in headers:
                xff = headers[b"x-forwarded-for"].decode("latin1")
                real_ip = xff.split(",")[-1].strip()
                if real_ip:
                    scope["client"] = (real_ip, 0)

            if b"x-forwarded-proto" in headers:
                proto = (
                    headers[b"x-forwarded-proto"].decode("latin1").split(",")[0].strip()
                )
                if proto in {"http", "https", "ws", "wss"}:
                    scope["scheme"] = proto

        return await self.app(scope, receive, send)


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


async def _run_recurring_generation() -> None:
    """Scheduler job: open a DB session and generate recurring transactions."""
    try:
        with Session(engine) as session:
            count = generate_recurring_transactions(session)
        logger.info("Recurring transactions generated: %d", count)
    except Exception:
        logger.exception("Recurring transaction generation failed")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    logger.info("SECRET_KEY loaded, length=%d", len(settings.SECRET_KEY))
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _run_recurring_generation,
        trigger="cron",
        day_of_week="mon",
        hour=2,
        timezone="UTC",
    )
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

IS_LOCAL_ENV = settings.ENVIRONMENT == "local"
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if IS_LOCAL_ENV else None,
    docs_url="/docs" if IS_LOCAL_ENV else None,
    redoc_url="/redoc" if IS_LOCAL_ENV else None,
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    )

# Extract real client IP from X-Forwarded-For set by Azure Container Apps ingress.
if settings.ENVIRONMENT != "local":
    app.add_middleware(_ContainerAppsProxyMiddleware)

app.include_router(api_router, prefix=settings.API_V1_STR)
