"""Conftest for schema tests.

These tests don't require database connection - they test schema validation only.
"""

import pytest


@pytest.fixture(scope="session", autouse=True)
def db() -> None:
    """Override the db fixture to not initialize database for schema tests."""
    yield None
