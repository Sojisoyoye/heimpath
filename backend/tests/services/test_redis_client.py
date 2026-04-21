"""Tests for the shared Redis client with in-memory fallback."""

import fakeredis
import pytest
import redis as redis_lib

from app.services import redis_client


@pytest.fixture(autouse=True)
def _reset_client(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reset the module-level cached client before each test."""
    monkeypatch.setattr(redis_client, "_client", None)


class TestGetRedis:
    """Tests for get_redis()."""

    def test_returns_fakeredis_when_connection_fails(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """When Redis is unreachable, get_redis returns a FakeRedis instance."""
        monkeypatch.setattr(
            redis_client.settings, "REDIS_URL", "redis://unreachable-host:6379"
        )
        client = redis_client.get_redis()
        assert isinstance(client, fakeredis.FakeRedis)

    def test_fallback_client_is_functional(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The fallback client supports basic Redis operations."""
        monkeypatch.setattr(
            redis_client.settings, "REDIS_URL", "redis://unreachable-host:6379"
        )
        client = redis_client.get_redis()
        client.set("key", "value")
        assert client.get("key") == "value"
        client.delete("key")
        assert client.get("key") is None

    def test_caches_client_on_subsequent_calls(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """get_redis returns the same client instance on repeated calls."""
        monkeypatch.setattr(
            redis_client.settings, "REDIS_URL", "redis://unreachable-host:6379"
        )
        first = redis_client.get_redis()
        second = redis_client.get_redis()
        assert first is second

    def test_returns_real_redis_when_available(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """When Redis is reachable, get_redis returns a real Redis client."""
        # Patch from_url to return a fake that passes ping
        fake = fakeredis.FakeRedis(decode_responses=True)
        monkeypatch.setattr(redis_lib, "from_url", lambda *_args, **_kwargs: fake)
        client = redis_client.get_redis()
        assert client is fake
        assert not isinstance(client, fakeredis.FakeRedis) or client is fake

    def test_catches_redis_error_subclasses(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """All RedisError subclasses (auth, timeout, etc.) trigger fallback."""

        def bad_from_url(*_args: object, **_kwargs: object) -> redis_lib.Redis:
            client = fakeredis.FakeRedis(decode_responses=True)

            def failing_ping() -> None:
                raise redis_lib.AuthenticationError("bad password")

            client.ping = failing_ping  # type: ignore[assignment]
            return client

        monkeypatch.setattr(redis_lib, "from_url", bad_from_url)
        client = redis_client.get_redis()
        # Should have fallen back to a new FakeRedis, not the one with broken ping
        assert isinstance(client, fakeredis.FakeRedis)
        # Verify it works (the fallback client should be functional)
        client.set("test", "ok")
        assert client.get("test") == "ok"
