"""Tenacity retry decorator instances for external service calls.

Three named retry strategies protect the three external integrations:
- stripe_retry       — Stripe API (sync, 3 attempts)
- translator_retry   — Azure Translator API (async, 3 attempts)
- anthropic_retry    — Anthropic Claude API (async, 2 attempts)

Usage::

    from app.core.reliability import stripe_retry

    @stripe_retry
    def create_checkout(...):
        return stripe.checkout.Session.create(...)

All decorators set ``reraise=True`` so the original exception propagates
to the caller once retries are exhausted — callers are responsible for
handling the final error.

Predicate functions use lazy imports where needed to avoid circular
dependencies with service modules.
"""

import logging

import stripe
import anthropic
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential_jitter,
)

_logger = logging.getLogger(__name__)


# ── Transient-error predicates ────────────────────────────────────────────────


def _is_transient_stripe_error(exc: BaseException) -> bool:
    """Return True for Stripe errors that are safe to retry.

    stripe-python 7.x removed APITimeoutError — timeouts now surface as
    APIConnectionError, so both connection issues and timeouts are covered
    by that single class.
    """
    return isinstance(
        exc,
        (
            stripe.APIConnectionError,
            stripe.RateLimitError,
        ),
    )


def _is_transient_translator_error(exc: BaseException) -> bool:
    """Return True for Azure Translator errors that are safe to retry.

    Uses a lazy import of TranslationError to avoid a circular dependency
    with translation_service.
    """
    import aiohttp  # noqa: PLC0415 — intentional lazy import

    if isinstance(exc, aiohttp.ClientConnectionError):
        return True

    # Lazy import to avoid circular dependency
    try:
        from app.services.translation_service import TranslationError  # noqa: PLC0415
    except ImportError:
        return False

    if isinstance(exc, TranslationError):
        msg = str(exc)
        return any(code in msg for code in ("429", "503", "504"))

    return False


def _is_transient_anthropic_error(exc: BaseException) -> bool:
    """Return True for Anthropic errors that are safe to retry."""
    return isinstance(
        exc,
        (
            anthropic.APIConnectionError,
            anthropic.APITimeoutError,
            anthropic.RateLimitError,
        ),
    )


# ── Retry decorators ──────────────────────────────────────────────────────────

stripe_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=1, max=10),
    retry=retry_if_exception(_is_transient_stripe_error),
    reraise=True,
    before_sleep=before_sleep_log(_logger, logging.WARNING),
)

translator_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=1, max=15),
    retry=retry_if_exception(_is_transient_translator_error),
    reraise=True,
    before_sleep=before_sleep_log(_logger, logging.WARNING),
)

anthropic_retry = retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential_jitter(initial=2, max=20),
    retry=retry_if_exception(_is_transient_anthropic_error),
    reraise=True,
    before_sleep=before_sleep_log(_logger, logging.WARNING),
)
