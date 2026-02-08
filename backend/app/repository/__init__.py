"""Data access repositories."""
from app.repository.base import BaseRepository
from app.repository.user_repository import UserRepository

__all__ = ["BaseRepository", "UserRepository"]
