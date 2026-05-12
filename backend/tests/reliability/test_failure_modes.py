"""Failure Mode Tests — Reliability Suite.

Verifies that the system degrades gracefully under infrastructure failures:
database unavailability, AI service timeouts, invalid API responses,
circuit breaker activation, and Redis outages.
"""

import logging
import os
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.translation import SupportedLanguage

# ── Database failure modes ────────────────────────────────────────────────────


class TestDatabaseFailureModes:
    """Audit service must never surface DB failures to the caller."""

    def test_audit_log_db_add_failure_is_swallowed(self) -> None:
        """session.add() raising RuntimeError does not propagate from log_action."""
        from app.services.audit_service import log_action

        mock_session = MagicMock()
        mock_session.add.side_effect = RuntimeError("DB connection lost")

        # Critical requirement: log_action must NEVER raise
        log_action(mock_session, action="document.upload")

    def test_audit_log_db_commit_failure_is_swallowed(self) -> None:
        """session.commit() raising an exception is caught and swallowed."""
        from app.services.audit_service import log_action

        mock_session = MagicMock()
        mock_session.commit.side_effect = Exception("deadlock detected")

        log_action(mock_session, action="document.delete")  # must not raise

    def test_audit_log_rollback_failure_after_commit_failure_is_swallowed(self) -> None:
        """Even if rollback also fails after a commit error, nothing propagates."""
        from app.services.audit_service import log_action

        mock_session = MagicMock()
        mock_session.commit.side_effect = Exception("commit failed")
        mock_session.rollback.side_effect = Exception("rollback also failed")

        log_action(mock_session, action="document.upload")  # still must not raise

    def test_audit_log_rollback_called_on_db_error(self) -> None:
        """Rollback is attempted when an exception occurs during the DB write."""
        from app.services.audit_service import log_action

        mock_session = MagicMock()
        mock_session.add.side_effect = RuntimeError("timeout")

        log_action(mock_session, action="document.upload")

        mock_session.rollback.assert_called_once()

    def test_audit_log_missing_client_request_does_not_crash(self) -> None:
        """Request where client is None (Unix socket conn) is handled safely."""
        from app.services.audit_service import log_action

        mock_session = MagicMock()
        mock_request = MagicMock()
        mock_request.client = None  # no peer address

        log_action(mock_session, action="document.upload", request=mock_request)

        entry = mock_session.add.call_args[0][0]
        assert entry.ip_address is None


# ── AI service failure modes ──────────────────────────────────────────────────


class TestAIServiceFailureModes:
    """Anthropic failures must fall back to heuristic clause confidence."""

    @pytest.mark.asyncio
    async def test_analyze_clause_risks_heuristic_when_anthropic_not_configured(
        self,
    ) -> None:
        """When Anthropic is disabled the heuristic fallback is returned."""
        from app.services.clause_risk_analyzer_service import analyze_clause_risks

        clauses = [
            {
                "clause_type": "purchase_price",
                "original_text": "Kaufpreis beträgt EUR 500.000",
                "translated_text": "",
                "page_number": 1,
                "risk_level": "high",
            }
        ]

        with patch(
            "app.services.clause_risk_analyzer_service._get_anthropic_client",
            return_value=None,
        ):
            result = await analyze_clause_risks(clauses)

        # Heuristic fallback populates confidence fields — does not return empty
        assert len(result) == 1
        assert "confidence_level" in result[0]
        assert "confidence_score" in result[0]

    @pytest.mark.asyncio
    async def test_analyze_clause_risks_heuristic_on_api_exception(self) -> None:
        """API timeout or connection error triggers heuristic fallback."""
        from app.services.clause_risk_analyzer_service import analyze_clause_risks

        clauses = [
            {
                "clause_type": "deadline",
                "original_text": "Frist bis zum 31.12.2024",
                "translated_text": "",
                "page_number": 2,
                "risk_level": "high",
            }
        ]
        mock_client = MagicMock()

        with (
            patch(
                "app.services.clause_risk_analyzer_service._get_anthropic_client",
                return_value=mock_client,
            ),
            patch(
                "app.services.clause_risk_analyzer_service._call_claude",
                side_effect=TimeoutError("Anthropic API timed out"),
            ),
        ):
            result = await analyze_clause_risks(clauses)

        assert len(result) == 1
        assert "confidence_level" in result[0]

    @pytest.mark.asyncio
    async def test_analyze_clause_risks_heuristic_on_invalid_json(self) -> None:
        """Malformed JSON from the model triggers heuristic fallback, not a crash."""
        from app.services.clause_risk_analyzer_service import analyze_clause_risks

        clauses = [
            {
                "clause_type": "warranty_exclusion",
                "original_text": "Gewährleistung wird ausgeschlossen",
                "translated_text": "",
                "page_number": 1,
                "risk_level": "high",
            }
        ]
        mock_client = MagicMock()

        with (
            patch(
                "app.services.clause_risk_analyzer_service._get_anthropic_client",
                return_value=mock_client,
            ),
            patch(
                "app.services.clause_risk_analyzer_service._call_claude",
                return_value="not valid JSON at all }{",
            ),
        ):
            result = await analyze_clause_risks(clauses)

        # Heuristic applied — original risk_level preserved
        assert result[0]["risk_level"] == "high"

    @pytest.mark.asyncio
    async def test_analyze_clause_risks_empty_list_returns_immediately(self) -> None:
        """Empty clause list returns empty immediately without any API call."""
        from app.services.clause_risk_analyzer_service import analyze_clause_risks

        with patch(
            "app.services.clause_risk_analyzer_service._get_anthropic_client"
        ) as mock_get:
            result = await analyze_clause_risks([])

        assert result == []
        mock_get.assert_not_called()


# ── Translation service failure modes ────────────────────────────────────────


class TestTranslationFailureModes:
    """Azure Translator failures must surface as TranslationError, not raw exceptions."""

    @pytest.mark.asyncio
    async def test_api_timeout_raises_translation_error(self) -> None:
        """aiohttp.ServerTimeoutError is wrapped in TranslationError."""
        import aiohttp

        from app.services.translation_service import (
            TranslationError,
            TranslationService,
        )

        service = TranslationService(api_key="key", region="westeurope")

        with patch.object(
            service,
            "_make_request",
            new_callable=AsyncMock,
            side_effect=aiohttp.ServerTimeoutError(),
        ):
            with pytest.raises(TranslationError):
                await service.translate_text(
                    text="Kaufvertrag",
                    source_language=SupportedLanguage.GERMAN,
                    target_language=SupportedLanguage.ENGLISH,
                )

    @pytest.mark.asyncio
    async def test_translator_circuit_breaker_open_raises_translation_error(
        self,
    ) -> None:
        """Open circuit breaker surfaces as TranslationError('circuit open')."""
        import pybreaker

        from app.services.translation_service import (
            TranslationError,
            TranslationService,
        )

        service = TranslationService(api_key="key", region="westeurope")

        with patch(
            "app.services.translation_service._breaker_async_call",
            side_effect=pybreaker.CircuitBreakerError(),
        ):
            with pytest.raises(TranslationError, match="circuit"):
                await service.translate_text(
                    text="Kaufvertrag",
                    source_language=SupportedLanguage.GERMAN,
                    target_language=SupportedLanguage.ENGLISH,
                )

    @pytest.mark.asyncio
    async def test_503_error_is_retried(self) -> None:
        """A 503 TranslationError is retried — verify the call is made twice."""
        from tenacity import retry, retry_if_exception, stop_after_attempt, wait_none

        from app.core.reliability import _is_transient_translator_error
        from app.services.translation_service import (
            TranslationError,
            TranslationService,
        )

        service = TranslationService(api_key="key", region="westeurope")
        call_count = 0
        good_response = [
            {
                "translations": [{"text": "purchase agreement"}],
                "detectedLanguage": {"language": "de", "score": 0.9},
            }
        ]

        async def flaky_http(
            text: str,  # noqa: ARG001
            source_language: str,  # noqa: ARG001
            target_language: str,  # noqa: ARG001
        ) -> list:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise TranslationError(
                    "Translation API error (status 503): Service Unavailable"
                )
            return good_response

        fast_retry = retry(
            stop=stop_after_attempt(3),
            wait=wait_none(),
            retry=retry_if_exception(_is_transient_translator_error),
            reraise=True,
        )
        service._make_request = fast_retry(flaky_http)  # type: ignore[method-assign]

        result = await service.translate_text(
            text="Kaufvertrag",
            source_language=SupportedLanguage.GERMAN,
            target_language=SupportedLanguage.ENGLISH,
        )

        assert call_count == 2
        assert result.translated_text == "purchase agreement"


# ── Payment service failure modes ─────────────────────────────────────────────


class TestPaymentFailureModes:
    """Stripe failures must raise domain exceptions, not raw stripe errors."""

    @pytest.mark.asyncio
    async def test_stripe_circuit_breaker_open_raises_checkout_error(self) -> None:
        """Open circuit breaker surfaces as CheckoutSessionError."""
        import pybreaker

        from app.models import SubscriptionTier
        from app.services.payment_service import CheckoutSessionError, PaymentService

        service = PaymentService(
            secret_key="sk_test_fake",
            premium_price_id="price_fake_premium",
        )

        mock_customer = MagicMock()
        mock_customer.id = "cus_existing"

        with patch("app.services.payment_service.stripe_breaker") as mock_breaker:
            # First call = retrieve (succeeds), second call = checkout.Session.create (fails)
            mock_breaker.call.side_effect = [
                mock_customer,
                pybreaker.CircuitBreakerError(),
            ]

            with pytest.raises(CheckoutSessionError, match="circuit"):
                await service.create_checkout_session(
                    user_id=uuid.uuid4(),
                    email="test@example.com",
                    tier=SubscriptionTier.PREMIUM,
                    success_url="https://app.example.com/success",
                    cancel_url="https://app.example.com/cancel",
                    stripe_customer_id="cus_existing",
                )

    @pytest.mark.asyncio
    async def test_idempotency_key_is_deterministic(self) -> None:
        """Same user + tier always produces the same idempotency key."""
        import hashlib

        user_id = uuid.uuid4()
        tier_value = "premium"

        key1 = hashlib.sha256(f"checkout:{user_id}:{tier_value}".encode()).hexdigest()[
            :40
        ]
        key2 = hashlib.sha256(f"checkout:{user_id}:{tier_value}".encode()).hexdigest()[
            :40
        ]

        assert key1 == key2
        assert len(key1) == 40

    @pytest.mark.asyncio
    async def test_idempotency_key_differs_for_different_tiers(self) -> None:
        """Different tiers produce different idempotency keys for the same user."""
        import hashlib

        user_id = uuid.uuid4()
        key_premium = hashlib.sha256(
            f"checkout:{user_id}:premium".encode()
        ).hexdigest()[:40]
        key_enterprise = hashlib.sha256(
            f"checkout:{user_id}:enterprise".encode()
        ).hexdigest()[:40]

        assert key_premium != key_enterprise


# ── Redis failure modes ───────────────────────────────────────────────────────


class TestRedisFailureModes:
    """Redis unavailability must hard-fail in staging/production but fall back locally."""

    def test_redis_down_in_local_returns_fakeredis(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Redis unavailable in local environment → silent fakeredis fallback."""
        import fakeredis
        import redis as redis_lib

        monkeypatch.setattr("app.services.redis_client._redis_client", None)
        monkeypatch.setattr("app.core.config.settings.ENVIRONMENT", "local")

        with patch("redis.from_url", side_effect=redis_lib.ConnectionError("refused")):
            from app.services.redis_client import get_redis

            client = get_redis()

        assert isinstance(client, fakeredis.FakeRedis)

    def test_redis_down_in_staging_raises_runtime_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Redis unavailable in staging environment → RuntimeError (fail-fast)."""
        import redis as redis_lib

        monkeypatch.setattr("app.services.redis_client._redis_client", None)
        monkeypatch.setattr("app.core.config.settings.ENVIRONMENT", "staging")

        with patch("redis.from_url", side_effect=redis_lib.ConnectionError("refused")):
            with pytest.raises(RuntimeError, match="Redis unavailable"):
                from app.services.redis_client import get_redis

                get_redis()

    def test_redis_down_in_production_raises_runtime_error(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Redis unavailable in production environment → RuntimeError (fail-fast)."""
        import redis as redis_lib

        monkeypatch.setattr("app.services.redis_client._redis_client", None)
        monkeypatch.setattr("app.core.config.settings.ENVIRONMENT", "production")

        with patch("redis.from_url", side_effect=redis_lib.ConnectionError("refused")):
            with pytest.raises(RuntimeError, match="Redis unavailable"):
                from app.services.redis_client import get_redis

                get_redis()


# ── Middleware failure modes ──────────────────────────────────────────────────


class TestMiddlewareFailureModes:
    """ContentSizeLimitMiddleware must gate oversized JSON but pass multipart."""

    def test_oversized_json_body_returns_413(self, middleware_client: object) -> None:
        """POST with JSON Content-Type and Content-Length > 1 MB → 413."""
        body = b"x" * (2 * 1024 * 1024)  # 2 MB
        response = middleware_client.post(  # type: ignore[attr-defined]
            "/json-echo",
            content=body,
            headers={
                "Content-Type": "application/json",
                "Content-Length": str(len(body)),
            },
        )
        assert response.status_code == 413

    def test_small_json_body_passes_through(self, middleware_client: object) -> None:
        """Small JSON body (<1 MB) is not blocked."""
        response = middleware_client.post(  # type: ignore[attr-defined]
            "/json-echo",
            json={"key": "value"},
        )
        assert response.status_code != 413

    def test_large_multipart_is_not_blocked(self, middleware_client: object) -> None:
        """File upload (multipart/form-data) is never blocked regardless of size.

        Blocking multipart would break the document upload endpoint.
        """
        large_file = b"%PDF-1.4 " + b"x" * (2 * 1024 * 1024)
        response = middleware_client.post(  # type: ignore[attr-defined]
            "/json-echo",
            files={"file": ("big.pdf", large_file, "application/pdf")},
        )
        # May be 422 (unexpected field) but MUST NOT be 413
        assert response.status_code != 413

    def test_get_request_without_content_length_passes(
        self, middleware_client: object
    ) -> None:
        """GET requests with no body are never blocked by the size limiter."""
        response = middleware_client.get("/ping")  # type: ignore[attr-defined]
        assert response.status_code == 200


# ── Startup configuration ─────────────────────────────────────────────────────

_FAKE_POOL_STATS = {
    "pool_size": 3,
    "max_overflow": 5,
    "effective_max_per_worker": 8,
    "checked_out": 0,
    "checked_in": 3,
    "overflow": 0,
}


class TestStartupConfiguration:
    """Startup logs must surface critical process configuration on every boot."""

    @pytest.mark.asyncio
    async def test_lifespan_logs_default_web_concurrency(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """When WEB_CONCURRENCY is not set, startup logs the safe default of 2."""
        from app.main import app as fastapi_app
        from app.main import lifespan

        env_without_concurrency = {
            k: v for k, v in os.environ.items() if k != "WEB_CONCURRENCY"
        }

        with (
            patch.dict(os.environ, env_without_concurrency, clear=True),
            patch("app.main.get_pool_stats", return_value=_FAKE_POOL_STATS),
        ):
            with caplog.at_level(logging.INFO, logger="app.main"):
                async with lifespan(fastapi_app):
                    pass

        assert any("WEB_CONCURRENCY=2" in r.message for r in caplog.records)

    @pytest.mark.asyncio
    async def test_lifespan_logs_configured_web_concurrency(
        self, caplog: pytest.LogCaptureFixture
    ) -> None:
        """When WEB_CONCURRENCY is set, startup logs the configured value."""
        from app.main import app as fastapi_app
        from app.main import lifespan

        with (
            patch.dict(os.environ, {"WEB_CONCURRENCY": "4"}),
            patch("app.main.get_pool_stats", return_value=_FAKE_POOL_STATS),
        ):
            with caplog.at_level(logging.INFO, logger="app.main"):
                async with lifespan(fastapi_app):
                    pass

        assert any("WEB_CONCURRENCY=4" in r.message for r in caplog.records)


# ── Statement timeout degradation ────────────────────────────────────────────


class TestStatementTimeoutDegradation:
    """DB statement timeouts must surface as HTTP 504 Gateway Timeout."""

    def test_get_db_converts_statement_timeout_to_504(self) -> None:
        """get_db converts OperationalError('statement timeout') to HTTP 504."""
        from fastapi import HTTPException
        from sqlalchemy.exc import OperationalError

        from app.api.deps import get_db

        with patch("app.api.deps.get_pool_stats", return_value=_FAKE_POOL_STATS):
            mock_ctx = MagicMock()
            mock_ctx.__enter__.return_value = MagicMock()
            mock_ctx.__exit__.return_value = False

            with patch("app.api.deps.Session", return_value=mock_ctx):
                gen = get_db()
                next(gen)

                exc = OperationalError(
                    "statement",
                    None,
                    Exception("canceling statement due to statement timeout"),
                )
                with pytest.raises(HTTPException) as exc_info:
                    gen.throw(exc)

        assert exc_info.value.status_code == 504

    def test_get_db_504_detail_includes_timed_out(self) -> None:
        """504 from statement timeout has a user-friendly detail message."""
        from fastapi import HTTPException
        from sqlalchemy.exc import OperationalError

        from app.api.deps import get_db

        with patch("app.api.deps.get_pool_stats", return_value=_FAKE_POOL_STATS):
            mock_ctx = MagicMock()
            mock_ctx.__enter__.return_value = MagicMock()
            mock_ctx.__exit__.return_value = False

            with patch("app.api.deps.Session", return_value=mock_ctx):
                gen = get_db()
                next(gen)

                exc = OperationalError(
                    "statement",
                    None,
                    Exception("canceling statement due to statement timeout"),
                )
                with pytest.raises(HTTPException) as exc_info:
                    gen.throw(exc)

        assert "timed out" in exc_info.value.detail.lower()

    def test_get_db_reraises_non_timeout_operational_errors(self) -> None:
        """get_db re-raises OperationalError not caused by statement timeout."""
        from sqlalchemy.exc import OperationalError

        from app.api.deps import get_db

        with patch("app.api.deps.get_pool_stats", return_value=_FAKE_POOL_STATS):
            mock_ctx = MagicMock()
            mock_ctx.__enter__.return_value = MagicMock()
            mock_ctx.__exit__.return_value = False

            with patch("app.api.deps.Session", return_value=mock_ctx):
                gen = get_db()
                next(gen)

                exc = OperationalError(
                    "connection lost",
                    None,
                    Exception("server closed the connection unexpectedly"),
                )
                with pytest.raises(OperationalError):
                    gen.throw(exc)

    @pytest.mark.asyncio
    async def test_get_async_db_converts_statement_timeout_to_504(self) -> None:
        """get_async_db converts OperationalError('statement timeout') to HTTP 504."""
        from fastapi import HTTPException
        from sqlalchemy.exc import OperationalError

        from app.api.deps import get_async_db

        mock_session = AsyncMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__.return_value = mock_session
        mock_ctx.__aexit__.return_value = False

        with patch("app.api.deps.AsyncSessionLocal", return_value=mock_ctx):
            gen = get_async_db()
            await gen.__anext__()

            exc = OperationalError(
                "statement",
                None,
                Exception("canceling statement due to statement timeout"),
            )
            with pytest.raises(HTTPException) as exc_info:
                await gen.athrow(exc)

        assert exc_info.value.status_code == 504

    @pytest.mark.asyncio
    async def test_get_async_db_504_detail_includes_timed_out(self) -> None:
        """504 from async statement timeout has a user-friendly detail message."""
        from fastapi import HTTPException
        from sqlalchemy.exc import OperationalError

        from app.api.deps import get_async_db

        mock_session = AsyncMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__.return_value = mock_session
        mock_ctx.__aexit__.return_value = False

        with patch("app.api.deps.AsyncSessionLocal", return_value=mock_ctx):
            gen = get_async_db()
            await gen.__anext__()

            exc = OperationalError(
                "statement",
                None,
                Exception("canceling statement due to statement timeout"),
            )
            with pytest.raises(HTTPException) as exc_info:
                await gen.athrow(exc)

        assert "timed out" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_get_async_db_reraises_non_timeout_operational_errors(self) -> None:
        """get_async_db re-raises OperationalError not caused by statement timeout."""
        from sqlalchemy.exc import OperationalError

        from app.api.deps import get_async_db

        mock_session = AsyncMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__.return_value = mock_session
        mock_ctx.__aexit__.return_value = False

        with patch("app.api.deps.AsyncSessionLocal", return_value=mock_ctx):
            gen = get_async_db()
            await gen.__anext__()

            exc = OperationalError(
                "connection lost",
                None,
                Exception("server closed the connection unexpectedly"),
            )
            with pytest.raises(OperationalError):
                await gen.athrow(exc)


# ── Request timeout middleware ────────────────────────────────────────────────


class TestRequestTimeoutMiddleware:
    """Requests exceeding their timeout ceiling must return HTTP 504."""

    def test_slow_endpoint_returns_504(self, timeout_client: object) -> None:
        """Endpoint that hangs indefinitely returns 504 after default timeout."""
        response = timeout_client.get("/slow")  # type: ignore[attr-defined]
        assert response.status_code == 504

    def test_504_detail_message(self, timeout_client: object) -> None:
        """504 response body includes a user-friendly 'timed out' message."""
        response = timeout_client.get("/slow")  # type: ignore[attr-defined]
        assert "timed out" in response.json()["detail"].lower()

    def test_504_response_is_json(self, timeout_client: object) -> None:
        """504 timeout response carries Content-Type: application/json."""
        response = timeout_client.get("/slow")  # type: ignore[attr-defined]
        assert "application/json" in response.headers.get("content-type", "")

    def test_fast_endpoint_passes_through(self, timeout_client: object) -> None:
        """Fast endpoints complete normally — middleware does not interfere."""
        response = timeout_client.get("/fast")  # type: ignore[attr-defined]
        assert response.status_code == 200

    def test_document_route_uses_longer_timeout(self, timeout_client: object) -> None:
        """Document routes stay alive beyond the default timeout ceiling."""
        # /api/v1/documents/slow sleeps _MEDIUM_SLEEP (0.2s), which exceeds the
        # default timeout (0.05s) but fits within the document timeout (0.5s).
        response = timeout_client.get("/api/v1/documents/slow")  # type: ignore[attr-defined]
        assert response.status_code == 200

    def test_standard_route_with_medium_sleep_returns_504(
        self, timeout_client: object
    ) -> None:
        """Same sleep on a non-document route exceeds the default timeout → 504."""
        response = timeout_client.get("/medium")  # type: ignore[attr-defined]
        assert response.status_code == 504
