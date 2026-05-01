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


# ── SECRET_KEY validation ──────────────────────────────────────────────────


def test_secret_key_changethis_raises_in_production() -> None:
    """SECRET_KEY='changethis' must raise ValueError in production."""
    kwargs = {**_base_settings_kwargs(), "SECRET_KEY": "changethis"}
    with pytest.raises(ValueError, match="changethis"):
        Settings(
            **kwargs,
            ENVIRONMENT="production",
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
