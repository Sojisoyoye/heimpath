"""Tests for app.services.quota_service.

Uses fakeredis so no real Redis connection is needed.
"""

from unittest.mock import MagicMock, patch

import fakeredis
import pytest
from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_redis(initial_value: int | None = None, key: str | None = None):
    """Return a fakeredis client, optionally seeded with an integer counter."""
    r = fakeredis.FakeRedis()
    if initial_value is not None and key is not None:
        r.set(key, initial_value)
    return r


# ---------------------------------------------------------------------------
# _monthly_key
# ---------------------------------------------------------------------------


class TestMonthlyKey:
    def test_format(self):
        from app.services.quota_service import _monthly_key

        key = _monthly_key()
        # e.g. "translator:chars:2026-05"
        assert key.startswith("translator:chars:")
        suffix = key[len("translator:chars:"):]
        year, month = suffix.split("-")
        assert int(year) >= 2026
        assert 1 <= int(month) <= 12

    def test_consistent_within_call(self):
        from app.services.quota_service import _monthly_key

        assert _monthly_key() == _monthly_key()


# ---------------------------------------------------------------------------
# _month_end_ttl
# ---------------------------------------------------------------------------


class TestMonthEndTtl:
    def test_positive(self):
        from app.services.quota_service import _month_end_ttl

        ttl = _month_end_ttl()
        assert ttl >= 1

    def test_at_most_one_month_in_seconds(self):
        from app.services.quota_service import _month_end_ttl

        ttl = _month_end_ttl()
        assert ttl <= 31 * 24 * 3600


# ---------------------------------------------------------------------------
# get_current_usage
# ---------------------------------------------------------------------------


class TestGetCurrentUsage:
    def test_returns_zero_when_key_absent(self):
        from app.services.quota_service import get_current_usage

        with patch("app.services.quota_service.get_redis", return_value=_make_redis()):
            assert get_current_usage() == 0

    def test_returns_stored_value(self):
        from app.services.quota_service import _monthly_key, get_current_usage

        key = _monthly_key()
        r = _make_redis(initial_value=123_456, key=key)
        with patch("app.services.quota_service.get_redis", return_value=r):
            assert get_current_usage() == 123_456

    def test_returns_zero_on_redis_error(self):
        import redis as redis_lib

        from app.services.quota_service import get_current_usage

        broken = MagicMock()
        broken.get.side_effect = redis_lib.RedisError("connection refused")
        with patch("app.services.quota_service.get_redis", return_value=broken):
            assert get_current_usage() == 0


# ---------------------------------------------------------------------------
# check_quota
# ---------------------------------------------------------------------------


class TestCheckQuota:
    def test_passes_when_under_limit(self, monkeypatch):
        from app.services import quota_service

        monkeypatch.setattr(quota_service, "get_current_usage", lambda: 100_000)
        # Should not raise.
        quota_service.check_quota(500)

    def test_raises_429_when_at_limit(self, monkeypatch):
        from app.services import quota_service

        monkeypatch.setattr(
            quota_service, "get_current_usage", lambda: 1_900_000
        )
        with pytest.raises(HTTPException) as exc_info:
            quota_service.check_quota(1)
        assert exc_info.value.status_code == 429
        assert "quota" in exc_info.value.detail.lower()

    def test_raises_429_when_over_limit(self, monkeypatch):
        from app.services import quota_service

        monkeypatch.setattr(
            quota_service, "get_current_usage", lambda: 2_000_000
        )
        with pytest.raises(HTTPException) as exc_info:
            quota_service.check_quota(1)
        assert exc_info.value.status_code == 429

    def test_logs_warning_near_alert_threshold(self, monkeypatch, caplog):
        import logging

        from app.services import quota_service

        # 80% of 1_900_000 = 1_520_000
        monkeypatch.setattr(quota_service, "get_current_usage", lambda: 1_520_000)
        with caplog.at_level(logging.WARNING, logger="app.services.quota_service"):
            quota_service.check_quota(1)
        assert any("quota" in r.message.lower() for r in caplog.records)

    def test_passes_when_redis_unavailable(self, monkeypatch):
        from app.services import quota_service

        monkeypatch.setattr(
            quota_service,
            "get_current_usage",
            MagicMock(side_effect=Exception("redis down")),
        )
        # Fail-open — should not raise.
        quota_service.check_quota(500)


# ---------------------------------------------------------------------------
# record_usage
# ---------------------------------------------------------------------------


class TestRecordUsage:
    def test_increments_counter(self):
        from app.services.quota_service import _monthly_key, record_usage

        r = _make_redis()
        with patch("app.services.quota_service.get_redis", return_value=r):
            record_usage(1000)
            record_usage(500)
        assert int(r.get(_monthly_key())) == 1500

    def test_sets_ttl_on_key(self):
        from app.services.quota_service import _monthly_key, record_usage

        r = _make_redis()
        with patch("app.services.quota_service.get_redis", return_value=r):
            record_usage(100)
        ttl = r.ttl(_monthly_key())
        assert ttl > 0

    def test_noop_for_zero_chars(self):
        from app.services.quota_service import _monthly_key, record_usage

        r = _make_redis()
        with patch("app.services.quota_service.get_redis", return_value=r):
            record_usage(0)
        assert r.get(_monthly_key()) is None

    def test_noop_for_negative_chars(self):
        from app.services.quota_service import _monthly_key, record_usage

        r = _make_redis()
        with patch("app.services.quota_service.get_redis", return_value=r):
            record_usage(-1)
        assert r.get(_monthly_key()) is None

    def test_logs_warning_when_crossing_alert_threshold(self, caplog):
        import logging

        from app.services.quota_service import _monthly_key, record_usage
        from app.core.config import settings

        # Seed so that after recording we cross the 80% threshold.
        alert_limit = int(
            settings.AZURE_TRANSLATOR_QUOTA_LIMIT
            * settings.AZURE_TRANSLATOR_QUOTA_ALERT_THRESHOLD
        )
        r = _make_redis(initial_value=alert_limit - 1, key=_monthly_key())
        with (
            patch("app.services.quota_service.get_redis", return_value=r),
            caplog.at_level(logging.WARNING, logger="app.services.quota_service"),
        ):
            record_usage(1)
        assert any("threshold" in r.message.lower() for r in caplog.records)

    def test_silent_on_redis_error(self):
        import redis as redis_lib

        from app.services.quota_service import record_usage

        broken = MagicMock()
        broken.incrby.side_effect = redis_lib.RedisError("redis down")
        with patch("app.services.quota_service.get_redis", return_value=broken):
            # Should not raise.
            record_usage(100)


# ---------------------------------------------------------------------------
# get_usage_stats
# ---------------------------------------------------------------------------


class TestGetUsageStats:
    def test_structure(self, monkeypatch):
        from app.services import quota_service

        monkeypatch.setattr(quota_service, "get_current_usage", lambda: 500_000)
        stats = quota_service.get_usage_stats()

        assert "month" in stats
        assert "characters_used" in stats
        assert "quota_limit" in stats
        assert "percentage_used" in stats
        assert "alert_threshold_pct" in stats
        assert "quota_reached" in stats
        assert "alert_active" in stats

    def test_values(self, monkeypatch):
        from app.services import quota_service
        from app.core.config import settings

        monkeypatch.setattr(quota_service, "get_current_usage", lambda: 950_000)
        stats = quota_service.get_usage_stats()

        assert stats["characters_used"] == 950_000
        assert stats["quota_limit"] == settings.AZURE_TRANSLATOR_QUOTA_LIMIT
        assert stats["quota_reached"] is False
        assert stats["alert_active"] is False

    def test_quota_reached_flag(self, monkeypatch):
        from app.services import quota_service
        from app.core.config import settings

        monkeypatch.setattr(
            quota_service,
            "get_current_usage",
            lambda: settings.AZURE_TRANSLATOR_QUOTA_LIMIT,
        )
        stats = quota_service.get_usage_stats()
        assert stats["quota_reached"] is True

    def test_alert_active_flag(self, monkeypatch):
        from app.services import quota_service
        from app.core.config import settings

        alert_limit = int(
            settings.AZURE_TRANSLATOR_QUOTA_LIMIT
            * settings.AZURE_TRANSLATOR_QUOTA_ALERT_THRESHOLD
        )
        monkeypatch.setattr(quota_service, "get_current_usage", lambda: alert_limit)
        stats = quota_service.get_usage_stats()
        assert stats["alert_active"] is True
