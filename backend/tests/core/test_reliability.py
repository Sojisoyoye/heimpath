"""Tests for app.core.reliability — retry predicates and decorator instances."""

from unittest.mock import MagicMock, patch

import anthropic
import pytest
import stripe

from app.core.reliability import (
    _is_transient_anthropic_error,
    _is_transient_stripe_error,
    _is_transient_translator_error,
    anthropic_retry,
    stripe_retry,
    translator_retry,
)


class TestIsTransientStripeError:
    """Predicate must accept retryable Stripe errors, reject everything else.

    stripe-python 7.x removed APITimeoutError — timeouts surface as
    APIConnectionError instead.
    """

    def test_api_connection_error_is_transient(self) -> None:
        assert _is_transient_stripe_error(
            stripe.APIConnectionError("connection failed")
        )

    def test_rate_limit_error_is_transient(self) -> None:
        # stripe 7.x RateLimitError constructor takes only a message
        err = stripe.RateLimitError("rate limit exceeded")
        assert _is_transient_stripe_error(err)

    def test_authentication_error_is_not_transient(self) -> None:
        err = stripe.AuthenticationError("invalid api key")
        assert not _is_transient_stripe_error(err)

    def test_value_error_is_not_transient(self) -> None:
        assert not _is_transient_stripe_error(ValueError("bad value"))

    def test_runtime_error_is_not_transient(self) -> None:
        assert not _is_transient_stripe_error(RuntimeError("crash"))


class TestIsTransientTranslatorError:
    """Predicate must handle Anthropic connection errors and status-coded TranslationErrors."""

    def test_anthropic_api_connection_error_is_transient(self) -> None:
        err = anthropic.APIConnectionError(request=MagicMock())
        assert _is_transient_translator_error(err)

    def test_anthropic_api_timeout_error_is_transient(self) -> None:
        err = anthropic.APITimeoutError(request=MagicMock())
        assert _is_transient_translator_error(err)

    def test_translation_error_429_is_transient(self) -> None:
        from app.services.translation_service import TranslationError

        err = TranslationError("API error 429: Too Many Requests")
        assert _is_transient_translator_error(err)

    def test_translation_error_503_is_transient(self) -> None:
        from app.services.translation_service import TranslationError

        err = TranslationError("API error 503: Service Unavailable")
        assert _is_transient_translator_error(err)

    def test_translation_error_504_is_transient(self) -> None:
        from app.services.translation_service import TranslationError

        err = TranslationError("API error 504: Gateway Timeout")
        assert _is_transient_translator_error(err)

    def test_translation_error_400_is_not_transient(self) -> None:
        from app.services.translation_service import TranslationError

        err = TranslationError("API error 400: Bad Request")
        assert not _is_transient_translator_error(err)

    def test_value_error_is_not_transient(self) -> None:
        assert not _is_transient_translator_error(ValueError("bad value"))

    def test_import_error_returns_false(self) -> None:
        """If TranslationError cannot be imported, non-Anthropic errors return False."""
        import sys

        with patch.dict(
            sys.modules,
            {"app.services.translation_service": None},  # type: ignore[dict-item]
        ):
            result = _is_transient_translator_error(RuntimeError("boom"))
        assert result is False


class TestIsTransientAnthropicError:
    """Predicate must accept retryable Anthropic errors, reject everything else."""

    def test_api_connection_error_is_transient(self) -> None:
        err = anthropic.APIConnectionError(request=MagicMock())
        assert _is_transient_anthropic_error(err)

    def test_api_timeout_error_is_transient(self) -> None:
        err = anthropic.APITimeoutError(request=MagicMock())
        assert _is_transient_anthropic_error(err)

    def test_rate_limit_error_is_transient(self) -> None:
        err = anthropic.RateLimitError(
            message="rate limited",
            response=MagicMock(status_code=429, headers={}),
            body=None,
        )
        assert _is_transient_anthropic_error(err)

    def test_authentication_error_is_not_transient(self) -> None:
        err = anthropic.AuthenticationError(
            message="invalid api key",
            response=MagicMock(status_code=401, headers={}),
            body=None,
        )
        assert not _is_transient_anthropic_error(err)

    def test_value_error_is_not_transient(self) -> None:
        assert not _is_transient_anthropic_error(ValueError("bad value"))

    def test_runtime_error_is_not_transient(self) -> None:
        assert not _is_transient_anthropic_error(RuntimeError("crash"))


class TestRetryDecorators:
    """Decorators must be callables that wrap functions correctly."""

    def test_stripe_retry_is_callable(self) -> None:
        assert callable(stripe_retry)

    def test_translator_retry_is_callable(self) -> None:
        assert callable(translator_retry)

    def test_anthropic_retry_is_callable(self) -> None:
        assert callable(anthropic_retry)

    def test_stripe_retry_wraps_function(self) -> None:
        call_count = 0

        @stripe_retry
        def always_succeeds() -> str:
            nonlocal call_count
            call_count += 1
            return "ok"

        result = always_succeeds()
        assert result == "ok"
        assert call_count == 1

    def test_translator_retry_wraps_function(self) -> None:
        @translator_retry
        def always_succeeds() -> int:
            return 42

        assert always_succeeds() == 42

    def test_anthropic_retry_wraps_function(self) -> None:
        @anthropic_retry
        def always_succeeds() -> bool:
            return True

        assert always_succeeds() is True

    def test_stripe_retry_reraises_non_transient_error(self) -> None:
        """Non-transient errors must propagate immediately without retrying."""
        call_count = 0

        @stripe_retry
        def raises_value_error() -> None:
            nonlocal call_count
            call_count += 1
            raise ValueError("bad input")

        with pytest.raises(ValueError, match="bad input"):
            raises_value_error()

        assert call_count == 1  # no retries for non-transient errors

    def test_anthropic_retry_reraises_non_transient_error(self) -> None:
        call_count = 0

        @anthropic_retry
        def raises_type_error() -> None:
            nonlocal call_count
            call_count += 1
            raise TypeError("wrong type")

        with pytest.raises(TypeError):
            raises_type_error()

        assert call_count == 1
