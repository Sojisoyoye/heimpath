"""Tests for scheduler_service — Redis-backed job tracking."""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import redis as redis_lib

from app.services.scheduler_service import get_last_run, record_job_run


class TestRecordJobRun:
    """record_job_run writes the current timestamp to Redis."""

    def test_writes_iso_timestamp_to_redis(self) -> None:
        """record_job_run stores an ISO-format timestamp under scheduler:last_run:{name}."""
        mock_redis = MagicMock()

        with patch("app.services.scheduler_service.get_redis", return_value=mock_redis):
            record_job_run("my_job")

        mock_redis.set.assert_called_once()
        key, value = mock_redis.set.call_args[0]
        assert key == "scheduler:last_run:my_job"
        # Value must be parseable as a UTC datetime
        parsed = datetime.fromisoformat(value)
        assert parsed.tzinfo is not None

    def test_swallows_redis_error(self) -> None:
        """record_job_run does not propagate RedisError — scheduler job must not fail."""
        mock_redis = MagicMock()
        mock_redis.set.side_effect = redis_lib.ConnectionError("Redis unavailable")

        with patch("app.services.scheduler_service.get_redis", return_value=mock_redis):
            record_job_run("my_job")  # must not raise

    def test_swallows_runtime_error_when_redis_unavailable(self) -> None:
        """record_job_run does not propagate RuntimeError from get_redis()."""
        with patch(
            "app.services.scheduler_service.get_redis",
            side_effect=RuntimeError("Redis not configured"),
        ):
            record_job_run("my_job")  # must not raise


class TestGetLastRun:
    """get_last_run reads the stored timestamp from Redis."""

    def test_returns_datetime_when_key_exists(self) -> None:
        """get_last_run parses the stored ISO timestamp into a datetime."""
        ts = datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
        mock_redis = MagicMock()
        mock_redis.get.return_value = ts.isoformat()

        with patch("app.services.scheduler_service.get_redis", return_value=mock_redis):
            result = get_last_run("my_job")

        assert result == ts
        mock_redis.get.assert_called_once_with("scheduler:last_run:my_job")

    def test_returns_none_when_key_missing(self) -> None:
        """get_last_run returns None when the job has never run."""
        mock_redis = MagicMock()
        mock_redis.get.return_value = None

        with patch("app.services.scheduler_service.get_redis", return_value=mock_redis):
            result = get_last_run("my_job")

        assert result is None

    def test_returns_none_on_redis_error(self) -> None:
        """get_last_run returns None when Redis raises — health check degrades gracefully."""
        mock_redis = MagicMock()
        mock_redis.get.side_effect = redis_lib.ConnectionError("Redis unavailable")

        with patch("app.services.scheduler_service.get_redis", return_value=mock_redis):
            result = get_last_run("my_job")

        assert result is None

    def test_returns_none_when_get_redis_raises(self) -> None:
        """get_last_run returns None when get_redis() itself raises RuntimeError."""
        with patch(
            "app.services.scheduler_service.get_redis",
            side_effect=RuntimeError("Redis not configured"),
        ):
            result = get_last_run("my_job")

        assert result is None


class TestStaleDetection:
    """Verify that stale timestamps are correctly identified by callers."""

    def test_recent_timestamp_is_not_stale(self) -> None:
        """A timestamp within 2× the interval is considered fresh."""
        recent = datetime.now(timezone.utc) - timedelta(hours=1)
        mock_redis = MagicMock()
        mock_redis.get.return_value = recent.isoformat()

        with patch("app.services.scheduler_service.get_redis", return_value=mock_redis):
            last_run = get_last_run("my_job")

        assert last_run is not None
        interval = timedelta(hours=2)
        assert datetime.now(timezone.utc) - last_run <= interval * 2

    def test_old_timestamp_is_stale(self) -> None:
        """A timestamp older than 2× the interval is considered stale."""
        old = datetime.now(timezone.utc) - timedelta(days=30)
        mock_redis = MagicMock()
        mock_redis.get.return_value = old.isoformat()

        with patch("app.services.scheduler_service.get_redis", return_value=mock_redis):
            last_run = get_last_run("my_job")

        assert last_run is not None
        interval = timedelta(days=7)
        assert datetime.now(timezone.utc) - last_run > interval * 2
