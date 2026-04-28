"""Tests for Settings validation in app.core.config."""

import pytest
from pydantic import ValidationError

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


def test_trusted_proxy_ips_wildcard_allowed_in_staging() -> None:
    """TRUSTED_PROXY_IPS='*' is permitted in staging (app is behind ACA ingress)."""
    s = Settings(
        **_base_settings_kwargs(),
        ENVIRONMENT="staging",
        TRUSTED_PROXY_IPS="*",
        _env_file=None,
    )
    assert s.TRUSTED_PROXY_IPS == "*"


def test_trusted_proxy_ips_wildcard_allowed_in_production() -> None:
    """TRUSTED_PROXY_IPS='*' is permitted in production (app is behind ACA ingress)."""
    s = Settings(
        **_base_settings_kwargs(),
        ENVIRONMENT="production",
        TRUSTED_PROXY_IPS="*",
        _env_file=None,
    )
    assert s.TRUSTED_PROXY_IPS == "*"


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


# ── SECRET_KEY validation ──────────────────────────────────────────────────


def test_secret_key_changethis_raises_in_production() -> None:
    """SECRET_KEY='changethis' must raise ValueError in production."""
    kwargs = {**_base_settings_kwargs(), "SECRET_KEY": "changethis"}
    with pytest.raises(ValueError, match="changethis"):
        Settings(
            **kwargs,
            ENVIRONMENT="production",
            TRUSTED_PROXY_IPS="10.0.0.0/8",
            _env_file=None,
        )


def test_secret_key_changethis_warns_in_local(recwarn: pytest.WarningsRecorder) -> None:
    """SECRET_KEY='changethis' emits a warning in local environment."""
    kwargs = {**_base_settings_kwargs(), "SECRET_KEY": "changethis"}
    Settings(**kwargs, ENVIRONMENT="local", _env_file=None)
    assert any("changethis" in str(w.message) for w in recwarn.list)


def test_postgres_password_empty_raises_in_production() -> None:
    """POSTGRES_PASSWORD='' must raise ValueError in production."""
    kwargs = {**_base_settings_kwargs(), "POSTGRES_PASSWORD": ""}
    with pytest.raises(ValueError, match="must not be empty"):
        Settings(
            **kwargs,
            ENVIRONMENT="production",
            TRUSTED_PROXY_IPS="10.0.0.0/8",
            _env_file=None,
        )


def test_postgres_password_empty_allowed_in_local() -> None:
    """POSTGRES_PASSWORD='' is permitted in local (passwordless Docker DB)."""
    kwargs = {**_base_settings_kwargs(), "POSTGRES_PASSWORD": ""}
    s = Settings(**kwargs, ENVIRONMENT="local", _env_file=None)
    assert s.POSTGRES_PASSWORD == ""


# ── SECRET_KEY missing ─────────────────────────────────────────────────────


def test_secret_key_missing_raises_validation_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Omitting SECRET_KEY entirely must raise ValidationError at startup."""
    monkeypatch.delenv("SECRET_KEY", raising=False)
    kwargs = {k: v for k, v in _base_settings_kwargs().items() if k != "SECRET_KEY"}
    with pytest.raises(ValidationError):
        Settings(**kwargs, ENVIRONMENT="local", _env_file=None)
