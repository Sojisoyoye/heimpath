import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import sentry_sdk
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.routing import APIRoute
from sqlmodel import Session
from starlette.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.core.db import engine
from app.services.portfolio_service import generate_recurring_transactions

logger = logging.getLogger(__name__)


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

# Trust proxy headers (X-Forwarded-Proto, X-Forwarded-For) from Azure Container Apps.
# trusted_hosts is controlled by TRUSTED_PROXY_IPS in config; set it to the load
# balancer CIDR in production rather than leaving it as "*".
if settings.ENVIRONMENT != "local":
    app.add_middleware(
        ProxyHeadersMiddleware,
        trusted_hosts=settings.TRUSTED_PROXY_IPS.split(","),
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
