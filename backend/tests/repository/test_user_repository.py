"""Tests for UserRepository data access layer."""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models import UserV2 as User
from app.repository.user_repository import UserRepository


class TestUserRepository:
    """Test UserRepository data access layer."""

    @pytest.fixture
    def mock_session(self) -> AsyncMock:
        """Create a mock async session."""
        session = AsyncMock()
        return session

    @pytest.fixture
    def repository(self, mock_session: AsyncMock) -> UserRepository:
        """Create repository with mock session."""
        return UserRepository(mock_session)

    @pytest.mark.asyncio
    async def test_get_by_email_returns_user(
        self, repository: UserRepository, mock_session: AsyncMock
    ) -> None:
        """Should return user when email exists."""
        expected_user = User(
            email="test@example.com",
            hashed_password="hashed",
        )
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = expected_user
        mock_session.execute.return_value = mock_result

        result = await repository.get_by_email("test@example.com")

        assert result == expected_user
        mock_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_by_email_returns_none_when_not_found(
        self, repository: UserRepository, mock_session: AsyncMock
    ) -> None:
        """Should return None when email not found."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        result = await repository.get_by_email("nonexistent@example.com")

        assert result is None

    @pytest.mark.asyncio
    async def test_create_user(
        self, repository: UserRepository, mock_session: AsyncMock
    ) -> None:
        """Should create and return user."""
        user = User(
            email="new@example.com",
            hashed_password="hashed",
        )

        result = await repository.create(user)

        mock_session.add.assert_called_once_with(user)
        mock_session.commit.assert_called_once()
        mock_session.refresh.assert_called_once_with(user)
        assert result == user

    @pytest.mark.asyncio
    async def test_get_by_id_returns_user(
        self, repository: UserRepository, mock_session: AsyncMock
    ) -> None:
        """Should return user when ID exists."""
        user_id = uuid.uuid4()
        expected_user = User(
            email="test@example.com",
            hashed_password="hashed",
        )
        mock_session.get.return_value = expected_user

        result = await repository.get_by_id(user_id)

        assert result == expected_user
        mock_session.get.assert_called_once_with(User, user_id)

    @pytest.mark.asyncio
    async def test_get_by_id_returns_none_when_not_found(
        self, repository: UserRepository, mock_session: AsyncMock
    ) -> None:
        """Should return None when ID not found."""
        user_id = uuid.uuid4()
        mock_session.get.return_value = None

        result = await repository.get_by_id(user_id)

        assert result is None

    @pytest.mark.asyncio
    async def test_delete_user(
        self, repository: UserRepository, mock_session: AsyncMock
    ) -> None:
        """Should delete user."""
        user = User(
            email="delete@example.com",
            hashed_password="hashed",
        )

        await repository.delete(user)

        mock_session.delete.assert_called_once_with(user)
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_user(
        self, repository: UserRepository, mock_session: AsyncMock
    ) -> None:
        """Should commit and refresh user."""
        user = User(
            email="update@example.com",
            hashed_password="hashed",
        )

        result = await repository.update(user)

        mock_session.commit.assert_called_once()
        mock_session.refresh.assert_called_once_with(user)
        assert result == user

    @pytest.mark.asyncio
    async def test_email_exists_returns_true(
        self, repository: UserRepository, mock_session: AsyncMock
    ) -> None:
        """Should return True when email exists."""
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = 1
        mock_session.execute.return_value = mock_result

        result = await repository.email_exists("existing@example.com")

        assert result is True

    @pytest.mark.asyncio
    async def test_email_exists_returns_false(
        self, repository: UserRepository, mock_session: AsyncMock
    ) -> None:
        """Should return False when email does not exist."""
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = 0
        mock_session.execute.return_value = mock_result

        result = await repository.email_exists("nonexistent@example.com")

        assert result is False

    @pytest.mark.asyncio
    async def test_count_returns_total(
        self, repository: UserRepository, mock_session: AsyncMock
    ) -> None:
        """Should return total user count."""
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = 42
        mock_session.execute.return_value = mock_result

        result = await repository.count()

        assert result == 42
