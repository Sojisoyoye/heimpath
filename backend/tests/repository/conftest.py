"""Conftest for repository unit tests.

These tests use mocked sessions - no database connection required.
"""

import pytest


@pytest.fixture(scope="session", autouse=False)
def db() -> None:
    """Override the db fixture to not initialize database for repository unit tests."""
    pass
