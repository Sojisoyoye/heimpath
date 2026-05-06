"""Module-level pybreaker circuit breaker singletons.

Each breaker protects one external integration:
- stripe_breaker     — Stripe API (sync calls)
- translator_breaker — Azure Translator API (async calls)
- anthropic_breaker  — Anthropic Claude API (async calls)

Usage at call sites::

    from app.core.circuit_breakers import stripe_breaker, async_call

    # sync
    result = stripe_breaker.call(stripe.checkout.Session.create, **params)

    # async (pybreaker.call_async requires tornado — use async_call instead)
    result = await async_call(translator_breaker, my_async_fn, *args)

This module intentionally imports ONLY pybreaker and logging to prevent
circular imports — services must not be imported here.
"""

import logging
from collections.abc import Callable
from typing import Any

import pybreaker

_logger = logging.getLogger(__name__)


class _LoggingListener(pybreaker.CircuitBreakerListener):
    """Log circuit state transitions and individual call failures."""

    def state_change(
        self,
        cb: pybreaker.CircuitBreaker,
        old_state: object,
        new_state: object,
    ) -> None:
        _logger.warning(
            "Circuit breaker '%s' changed state: %s -> %s",
            cb.name,
            old_state,
            new_state,
        )

    def failure(
        self,
        cb: pybreaker.CircuitBreaker,
        exc: BaseException,
    ) -> None:
        _logger.error(
            "Circuit breaker '%s' recorded failure (%s/%s): %s",
            cb.name,
            cb.fail_counter,
            cb.fail_max,
            exc,
        )


_listener = _LoggingListener()

stripe_breaker = pybreaker.CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    name="stripe",
    listeners=[_listener],
)

translator_breaker = pybreaker.CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    name="translator",
    listeners=[_listener],
)

anthropic_breaker = pybreaker.CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    name="anthropic",
    listeners=[_listener],
)


async def async_call(
    breaker: pybreaker.CircuitBreaker,
    func: Callable[..., Any],
    *args: Any,
    **kwargs: Any,
) -> Any:
    """Async-compatible circuit breaker call.

    pybreaker's ``call_async`` requires tornado (``HAS_TORNADO_SUPPORT``),
    which is not available in all environments.  This wrapper uses pybreaker's
    public state API to achieve the same effect natively with asyncio.

    Raises:
        pybreaker.CircuitBreakerError: If the circuit is open.
    """
    # ``state`` is a property that handles half-open → open/closed transitions.
    # ``before_call`` raises CircuitBreakerError immediately when the circuit is open.
    state = breaker.state
    state.before_call(func, *args, **kwargs)

    for listener in breaker.listeners:
        listener.before_call(breaker, func, *args, **kwargs)

    try:
        result = await func(*args, **kwargs)
        state.on_success()
        return result
    except BaseException as exc:
        # on_failure increments the fail counter and may trip the circuit,
        # in which case it raises CircuitBreakerError itself.
        state.on_failure(exc)
        raise
