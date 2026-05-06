"""User repository for database operations."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repository.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User database operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, User)

    async def get_by_email(self, email: str) -> User | None:
        """Get user by email address."""
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def count(self) -> int:
        """Get total user count."""
        stmt = select(func.count()).select_from(User)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def get_paginated(self, skip: int = 0, limit: int = 100) -> list[User]:
        """Get users with pagination, ordered by created_at desc."""
        stmt = select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def email_exists(self, email: str) -> bool:
        """Check if email already exists."""
        stmt = select(func.count()).select_from(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one() > 0
