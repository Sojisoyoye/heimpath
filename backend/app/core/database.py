"""Async database configuration for SQLAlchemy."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# asyncpg accepts server-side GUC overrides via server_settings.
# statement_timeout is in milliseconds (same unit as DB_STATEMENT_TIMEOUT_MS).
_async_connect_args: dict[str, object] = {
    "server_settings": {"statement_timeout": str(settings.DB_STATEMENT_TIMEOUT_MS)},
}
if settings.ENVIRONMENT != "local":
    _async_connect_args["ssl"] = True

async_engine = create_async_engine(
    str(settings.ASYNC_DATABASE_URI),
    echo=settings.ENVIRONMENT == "local",
    pool_pre_ping=True,
    connect_args=_async_connect_args,
    pool_size=3,
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=1800,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Provide async database session dependency."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
