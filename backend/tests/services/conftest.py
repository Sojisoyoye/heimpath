"""Conftest for service unit tests.

These tests don't require database connection - they test service logic only.
"""

import pytest


@pytest.fixture(scope="session", autouse=True)
def db() -> None:
    """Override the db fixture to not initialize database for service unit tests."""
    yield None
