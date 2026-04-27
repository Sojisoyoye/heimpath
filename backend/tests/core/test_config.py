"""Tests for Settings validation in app.core.config."""

import pytest

from app.core.config import Settings


def _base_settings_kwargs() -> dict:
    """Minimal kwargs required to instantiate Settings without reading .env."""
    return {
        "PROJECT_NAME": "test",
        "POSTGRES_SERVER": "localhost",
        "POSTGRES_USER": "test",
        "POSTGRES_PASSWORD": "test",
        "POSTGRES_DB": "test",
        "FIRST_SUPERUSER": "admin@example.com",
        "FIRST_SUPERUSER_PASSWORD": "test",
        "SECRET_KEY": "test-secret",
    }


def test_trusted_proxy_ips_wildcard_rejected_in_staging() -> None:
    """TRUSTED_PROXY_IPS='*' must raise ValueError in staging."""
    with pytest.raises(ValueError, match="TRUSTED_PROXY_IPS"):
        Settings(
            **_base_settings_kwargs(),
            ENVIRONMENT="staging",
            TRUSTED_PROXY_IPS="*",
            _env_file=None,
        )


def test_trusted_proxy_ips_wildcard_rejected_in_production() -> None:
    """TRUSTED_PROXY_IPS='*' must raise ValueError in production."""
    with pytest.raises(ValueError, match="TRUSTED_PROXY_IPS"):
        Settings(
            **_base_settings_kwargs(),
            ENVIRONMENT="production",
            TRUSTED_PROXY_IPS="*",
            _env_file=None,
        )


def test_trusted_proxy_ips_wildcard_allowed_in_local() -> None:
    """TRUSTED_PROXY_IPS='*' is permitted in local environment."""
    s = Settings(
        **_base_settings_kwargs(),
        ENVIRONMENT="local",
        TRUSTED_PROXY_IPS="*",
        _env_file=None,
    )
    assert s.TRUSTED_PROXY_IPS == "*"


def test_trusted_proxy_ips_cidr_allowed_in_production() -> None:
    """A specific CIDR range is accepted in production."""
    s = Settings(
        **_base_settings_kwargs(),
        ENVIRONMENT="production",
        TRUSTED_PROXY_IPS="10.0.0.0/8",
        _env_file=None,
    )
    assert s.TRUSTED_PROXY_IPS == "10.0.0.0/8"
