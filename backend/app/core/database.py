"""Async database configuration for SQLAlchemy."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

_async_connect_args: dict = {"ssl": True} if settings.ENVIRONMENT != "local" else {}

async_engine = create_async_engine(
    str(settings.ASYNC_DATABASE_URI),
    echo=settings.ENVIRONMENT == "local",
    pool_pre_ping=True,
    connect_args=_async_connect_args,
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
