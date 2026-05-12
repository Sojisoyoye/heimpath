import logging
from collections.abc import AsyncGenerator, Generator
from typing import Annotated, NoReturn

import jwt
import sentry_sdk
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlalchemy.exc import OperationalError
from sqlalchemy.exc import TimeoutError as PoolTimeoutError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.db import engine, get_pool_stats
from app.models import TokenPayload, User

logger = logging.getLogger(__name__)

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)

reusable_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False,
)


def _raise_statement_timeout(exc: OperationalError) -> NoReturn:
    """Log DB statement timeout to Sentry at WARNING and raise HTTP 504."""
    logger.warning("DB statement timeout: %s", exc)
    with sentry_sdk.new_scope() as scope:
        scope.set_tag("error_type", "statement_timeout")
        sentry_sdk.capture_exception(exc)
    raise HTTPException(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        detail="Database query timed out. Please try again later.",
    ) from exc


def _raise_pool_exhausted(stats: dict[str, int]) -> NoReturn:
    """Log pool exhaustion to Sentry and raise HTTP 503 with Retry-After."""
    logger.warning(
        "DB pool exhausted: checked_out=%d/%d",
        stats["checked_out"],
        stats["effective_max_per_worker"],
    )
    with sentry_sdk.new_scope() as scope:
        scope.set_context("pool", stats)
        sentry_sdk.capture_message("DB pool exhausted", level="warning")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Service temporarily unavailable — please retry in a moment",
        headers={"Retry-After": str(settings.POOL_EXHAUSTION_BACKOFF_SECONDS)},
    )


def get_db() -> Generator[Session, None, None]:
    # Pre-check: fail immediately when pool is at capacity rather than
    # queuing for up to pool_timeout (30 s) waiting for a slot to free up.
    stats = get_pool_stats()
    if stats["checked_out"] >= stats["effective_max_per_worker"]:
        _raise_pool_exhausted(stats)
    try:
        with Session(engine) as session:
            try:
                yield session
            except OperationalError as exc:
                if "statement timeout" in str(exc).lower():
                    _raise_statement_timeout(exc)
                raise
    except PoolTimeoutError:
        # Fallback for the race between pre-check and session acquisition.
        _raise_pool_exhausted(get_pool_stats())


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Provide async database session dependency."""
    try:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            except OperationalError as exc:
                if "statement timeout" in str(exc).lower():
                    _raise_statement_timeout(exc)
                raise
            finally:
                await session.close()
    except PoolTimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable — please retry in a moment",
            headers={"Retry-After": str(settings.POOL_EXHAUSTION_BACKOFF_SECONDS)},
        )


SessionDep = Annotated[Session, Depends(get_db)]
AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_db)]
# Kept for Swagger UI compatibility (Bearer token via OAuth2 flow)
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def _resolve_token(
    request: Request,
    bearer: Annotated[str | None, Depends(reusable_oauth2_optional)] = None,
) -> str | None:
    """Return the best available access token: Bearer header first, then cookie.

    Reading the cookie via ``request.cookies`` (not via FastAPI's ``Cookie()``
    parameter type) prevents the cookie from being documented in the OpenAPI
    schema, which would pollute every endpoint's generated SDK input type.
    """
    return bearer or request.cookies.get("access_token")


def get_current_user(
    session: SessionDep,
    token: Annotated[str | None, Depends(_resolve_token)] = None,
) -> User:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        # Reject refresh tokens — only access tokens are valid here
        if payload.get("type") == "refresh":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Could not validate credentials",
            )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_optional_current_user(
    session: SessionDep,
    token: Annotated[str | None, Depends(_resolve_token)] = None,
) -> User | None:
    """Return the current user if a valid token is provided, otherwise None."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        # Reject refresh tokens
        if payload.get("type") == "refresh":
            return None
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        return None
    user = session.get(User, token_data.sub)
    if not user or not user.is_active:
        return None
    return user


OptionalCurrentUser = Annotated[User | None, Depends(get_optional_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user
