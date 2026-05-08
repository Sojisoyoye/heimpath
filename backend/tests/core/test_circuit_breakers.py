"""Tests for app.core.circuit_breakers."""

from unittest.mock import patch

import pybreaker

from app.core.circuit_breakers import (
    _LoggingListener,
    anthropic_breaker,
    redis_breaker,
    stripe_breaker,
    translator_breaker,
)


class TestCircuitBreakerConfiguration:
    """Each singleton must be configured per spec: fail_max=5, reset_timeout=60."""

    def test_stripe_breaker_fail_max(self) -> None:
        assert stripe_breaker.fail_max == 5

    def test_stripe_breaker_reset_timeout(self) -> None:
        assert stripe_breaker.reset_timeout == 60

    def test_stripe_breaker_name(self) -> None:
        assert stripe_breaker.name == "stripe"

    def test_translator_breaker_fail_max(self) -> None:
        assert translator_breaker.fail_max == 5

    def test_translator_breaker_reset_timeout(self) -> None:
        assert translator_breaker.reset_timeout == 60

    def test_translator_breaker_name(self) -> None:
        assert translator_breaker.name == "translator"

    def test_anthropic_breaker_fail_max(self) -> None:
        assert anthropic_breaker.fail_max == 5

    def test_anthropic_breaker_reset_timeout(self) -> None:
        assert anthropic_breaker.reset_timeout == 60

    def test_anthropic_breaker_name(self) -> None:
        assert anthropic_breaker.name == "anthropic"

    def test_all_breakers_start_closed(self) -> None:
        for breaker in (stripe_breaker, translator_breaker, anthropic_breaker):
            assert breaker.current_state == "closed"

    def test_redis_breaker_fail_max(self) -> None:
        assert redis_breaker.fail_max == 10

    def test_redis_breaker_reset_timeout(self) -> None:
        assert redis_breaker.reset_timeout == 15

    def test_redis_breaker_name(self) -> None:
        assert redis_breaker.name == "redis"

    def test_redis_breaker_starts_closed(self) -> None:
        assert redis_breaker.current_state == "closed"


class TestCircuitBreakerSingletons:
    """Singletons must be distinct objects sharing the same listener."""

    def test_breakers_are_distinct_instances(self) -> None:
        assert stripe_breaker is not translator_breaker
        assert translator_breaker is not anthropic_breaker
        assert stripe_breaker is not anthropic_breaker
        assert redis_breaker is not stripe_breaker
        assert redis_breaker is not translator_breaker
        assert redis_breaker is not anthropic_breaker

    def test_each_breaker_has_listener(self) -> None:
        for breaker in (
            stripe_breaker,
            translator_breaker,
            anthropic_breaker,
            redis_breaker,
        ):
            assert len(breaker.listeners) == 1
            assert isinstance(breaker.listeners[0], _LoggingListener)

    def test_all_breakers_share_same_listener_instance(self) -> None:
        listener_ids = {
            id(b.listeners[0])
            for b in (
                stripe_breaker,
                translator_breaker,
                anthropic_breaker,
                redis_breaker,
            )
        }
        assert len(listener_ids) == 1, (
            "All breakers should share the same _LoggingListener"
        )


class TestLoggingListener:
    """_LoggingListener must log state changes and failures at the correct level."""

    def test_failure_logs_at_error_level(self) -> None:
        listener = _LoggingListener()
        cb = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=60, name="test-failure")

        with patch("app.core.circuit_breakers._logger") as mock_logger:
            listener.failure(cb, RuntimeError("connection refused"))

        mock_logger.error.assert_called_once()

    def test_failure_log_includes_breaker_name(self) -> None:
        listener = _LoggingListener()
        cb = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=60, name="test-counter")

        with patch("app.core.circuit_breakers._logger") as mock_logger:
            listener.failure(cb, ValueError("timeout"))

        call_args = mock_logger.error.call_args
        # Second positional arg is the breaker name
        assert call_args.args[1] == "test-counter"

    def test_failure_log_includes_fail_counter_and_max(self) -> None:
        listener = _LoggingListener()
        cb = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=60, name="test-counts")

        with patch("app.core.circuit_breakers._logger") as mock_logger:
            listener.failure(cb, ValueError("timeout"))

        call_args = mock_logger.error.call_args
        # args[2] = fail_counter, args[3] = fail_max
        assert call_args.args[3] == 5

    def test_state_change_logs_at_warning_level(self) -> None:
        listener = _LoggingListener()
        cb = pybreaker.CircuitBreaker(fail_max=2, reset_timeout=60, name="test-state")

        with patch("app.core.circuit_breakers._logger") as mock_logger:
            listener.state_change(cb, "closed", "open")

        mock_logger.warning.assert_called_once()

    def test_state_change_log_includes_breaker_name(self) -> None:
        listener = _LoggingListener()
        cb = pybreaker.CircuitBreaker(fail_max=2, reset_timeout=60, name="test-names")

        with patch("app.core.circuit_breakers._logger") as mock_logger:
            listener.state_change(cb, "closed", "open")

        call_args = mock_logger.warning.call_args
        assert call_args.args[1] == "test-names"

    def test_state_change_log_includes_old_and_new_state(self) -> None:
        listener = _LoggingListener()
        cb = pybreaker.CircuitBreaker(fail_max=2, reset_timeout=60, name="test-states")

        with patch("app.core.circuit_breakers._logger") as mock_logger:
            listener.state_change(cb, "closed", "open")

        call_args = mock_logger.warning.call_args
        assert call_args.args[2] == "closed"
        assert call_args.args[3] == "open"

    def test_listener_is_subclass_of_circuit_breaker_listener(self) -> None:
        assert issubclass(_LoggingListener, pybreaker.CircuitBreakerListener)

    def test_listener_instance_is_logging_listener(self) -> None:
        listener = _LoggingListener()
        assert isinstance(listener, _LoggingListener)
        assert isinstance(listener, pybreaker.CircuitBreakerListener)
