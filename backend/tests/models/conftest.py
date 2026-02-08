"""Conftest for model unit tests.

These tests don't require database connection - they test model structure only.
"""
import pytest


@pytest.fixture(scope="session", autouse=False)
def db() -> None:
    """Override the db fixture to not initialize database for model unit tests."""
    pass
