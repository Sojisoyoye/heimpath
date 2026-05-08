from typing import Annotated

import pybreaker
import redis as redis_lib
from fastapi import APIRouter, Depends, HTTPException
from pydantic.networks import EmailStr
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, text

from app.api.deps import get_current_active_superuser, get_db
from app.core.circuit_breakers import (
    anthropic_breaker,
    redis_breaker,
    stripe_breaker,
    translator_breaker,
)
from app.core.db import get_pool_stats
from app.models import Message
from app.services.redis_client import get_redis
from app.utils import generate_test_email, send_email

router = APIRouter(prefix="/utils", tags=["utils"])


@router.post(
    "/test-email/",
    dependencies=[Depends(get_current_active_superuser)],
    status_code=201,
)
def test_email(email_to: EmailStr) -> Message:
    """
    Test emails.
    """
    email_data = generate_test_email(email_to=email_to)
    send_email(
        email_to=email_to,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Test email sent")


@router.get("/health-check/")
def health_check(db: Annotated[Session, Depends(get_db)]) -> bool:
    # Sync def — get_db is a sync generator; async is not needed here.
    # SELECT 1 is intentionally cheap; pool_pre_ping validates the connection before
    # checkout so this probe adds minimal pool pressure even at short probe intervals.
    try:
        db.exec(text("SELECT 1"))
        return True
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


@router.get(
    "/health-check/redis/",
    dependencies=[Depends(get_current_active_superuser)],
)
def redis_health_check() -> bool:
    """Verify Redis connectivity. Superuser-only — not for public probing."""
    # Sync def — get_redis() is synchronous; no async I/O here.
    try:
        client = get_redis()
        client.ping()
        return True
    except (redis_lib.RedisError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Redis unavailable") from exc


@router.get(
    "/health-check/circuit-breakers/",
    dependencies=[Depends(get_current_active_superuser)],
)
def circuit_breaker_health_check() -> dict[str, dict[str, int | str]]:
    """Return the current state of all circuit breakers. Superuser-only."""

    def _state(cb: pybreaker.CircuitBreaker) -> dict[str, int | str]:
        return {
            "state": cb.current_state,
            "fail_counter": cb.fail_counter,
            "fail_max": cb.fail_max,
        }

    return {
        "stripe": _state(stripe_breaker),
        "translator": _state(translator_breaker),
        "anthropic": _state(anthropic_breaker),
        "redis": _state(redis_breaker),
    }


@router.get(
    "/db-pool-stats/",
    dependencies=[Depends(get_current_active_superuser)],
)
def db_pool_stats() -> dict[str, int]:
    """Current DB connection pool statistics. Superuser-only.

    Use to detect pool pressure in real time — high checked_out relative to
    effective_max_per_worker indicates the pool is near exhaustion.
    """
    return get_pool_stats()
