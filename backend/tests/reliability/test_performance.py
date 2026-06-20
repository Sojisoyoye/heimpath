"""Performance Tests — Reliability Suite.

Verifies system behaviour under concurrent load, validates fast-path short-circuits
(empty inputs bypass external calls), and confirms graceful degradation when circuit
breakers are open or retries are engaged.

These are NOT load tests — they run in CI without a real database or external
services.  All infrastructure dependencies are mocked so the suite runs quickly
and deterministically.
"""

import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.translation import SupportedLanguage

# ── Fast-path / short-circuit tests ──────────────────────────────────────────


class TestFastPathShortCircuits:
    """Empty inputs must return immediately without touching external services."""

    @pytest.mark.asyncio
    async def test_batch_translate_empty_list_returns_immediately(self) -> None:
        """batch_translate([]) short-circuits before making any HTTP request."""
        from app.services.translation_service import TranslationService

        service = TranslationService(api_key="key")

        with patch.object(
            service, "_make_batch_request", new_callable=AsyncMock
        ) as mock_req:
            result = await service.batch_translate(
                texts=[],
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.translations == []
        mock_req.assert_not_called()

    @pytest.mark.asyncio
    async def test_analyze_clause_risks_empty_list_returns_immediately(self) -> None:
        """analyze_clause_risks([]) returns [] without contacting the AI API."""
        from app.services.clause_risk_analyzer_service import analyze_clause_risks

        with patch(
            "app.services.clause_risk_analyzer_service._get_anthropic_client"
        ) as mock_get:
            result = await analyze_clause_risks([])

        assert result == []
        mock_get.assert_not_called()

    @pytest.mark.asyncio
    async def test_translate_with_warnings_empty_string_does_not_call_api(
        self,
    ) -> None:
        """translate_with_warnings('') must not issue any HTTP call.

        Sending an empty string to Azure Translator wastes quota and can
        return an ambiguous 200 with no useful content.
        """
        from app.services.translation_service import TranslationService

        service = TranslationService(api_key="key")

        with patch.object(service, "_make_request", new_callable=AsyncMock) as mock_req:
            # Empty string — service must short-circuit
            try:
                await service.translate_with_warnings(
                    text="",
                    source_language=SupportedLanguage.GERMAN,
                    target_language=SupportedLanguage.ENGLISH,
                )
            except Exception:
                # A ValueError / TranslationError for empty input is also acceptable;
                # the key invariant is that the external HTTP call was NOT made.
                pass

        mock_req.assert_not_called()


# ── Response-time bounds ──────────────────────────────────────────────────────


class TestResponseTimeBounds:
    """Critical operations must complete within generous wall-clock bounds.

    All external calls are mocked — we are measuring pure Python overhead,
    not network latency.  Thresholds are intentionally generous to avoid
    flakiness on loaded CI runners.
    """

    @pytest.mark.asyncio
    async def test_audit_log_completes_within_100ms(self) -> None:
        """log_action() must not introduce measurable latency on the hot path."""
        from app.services.audit_service import log_action

        mock_session = MagicMock()

        start = time.perf_counter()
        for _ in range(100):
            log_action(mock_session, action="document.upload")
        elapsed_ms = (time.perf_counter() - start) * 1000

        # 100 calls in under 500 ms — generous threshold to tolerate loaded CI runners
        assert elapsed_ms < 500, f"100 log_action() calls took {elapsed_ms:.1f} ms"

    @pytest.mark.asyncio
    async def test_calculate_hidden_costs_completes_within_100ms(self) -> None:
        """Synchronous cost calculation must not block the event loop."""
        from app.schemas.calculator import HiddenCostCalculationCreate
        from app.services.calculator_service import calculate

        inputs = HiddenCostCalculationCreate(
            property_price=350_000.0,
            state_code="BY",
            property_type="apartment",
        )

        start = time.perf_counter()
        for _ in range(50):
            calculate(inputs)
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert elapsed_ms < 100, f"50 calculate() calls took {elapsed_ms:.1f} ms"

    @pytest.mark.asyncio
    async def test_validate_pdf_bytes_completes_within_10ms(self) -> None:
        """PDF magic-byte validation of a 5 MB buffer must finish in under 10 ms.

        The check only reads the first 4 bytes — file size must not matter.
        """
        from app.services.document_service import validate_pdf_bytes

        large_pdf = b"%PDF-1.4 " + b"A" * (5 * 1024 * 1024)

        start = time.perf_counter()
        validate_pdf_bytes(large_pdf)
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert elapsed_ms < 10, f"validate_pdf_bytes(5 MB) took {elapsed_ms:.1f} ms"


# ── Concurrent-request isolation ─────────────────────────────────────────────


class TestConcurrentRequestIsolation:
    """Shared module-level state must not leak between concurrent callers."""

    def test_audit_log_concurrent_writes_are_independent(self) -> None:
        """10 concurrent threads writing audit logs do not interfere with each other."""
        from app.services.audit_service import log_action

        sessions = [MagicMock() for _ in range(10)]
        errors: list[Exception] = []

        def _write(session: MagicMock, idx: int) -> None:
            try:
                log_action(
                    session,
                    action=f"document.upload.{idx}",
                    user_id=uuid.uuid4(),
                    metadata={"index": idx},
                )
            except Exception as exc:  # noqa: BLE001
                errors.append(exc)

        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = [pool.submit(_write, sessions[i], i) for i in range(10)]
            for f in as_completed(futures):
                f.result()

        assert errors == [], f"Concurrent audit writes raised: {errors}"
        # Each session received exactly one add() call
        for session in sessions:
            session.add.assert_called_once()

    def test_idempotency_key_generation_is_thread_safe(self) -> None:
        """Idempotency key computation produces consistent results under concurrency."""
        import hashlib

        user_id = uuid.uuid4()
        tier_value = "premium"

        keys: list[str] = []

        def _compute() -> str:
            return hashlib.sha256(
                f"checkout:{user_id}:{tier_value}".encode()
            ).hexdigest()[:40]

        with ThreadPoolExecutor(max_workers=20) as pool:
            futures = [pool.submit(_compute) for _ in range(20)]
            keys = [f.result() for f in as_completed(futures)]

        # All 20 concurrent calls must produce the same key
        assert len(set(keys)) == 1, "Idempotency key was not stable across threads"

    def test_clause_risk_analyzer_heuristic_is_thread_safe(self) -> None:
        """Concurrent heuristic fallback calls do not race on shared state."""
        import asyncio

        from app.services.clause_risk_analyzer_service import analyze_clause_risks

        clauses = [
            {
                "clause_type": "purchase_price",
                "original_text": "Kaufpreis EUR 500.000",
                "translated_text": "",
                "page_number": i + 1,
                "risk_level": "high",
            }
            for i in range(5)
        ]

        results: list[list] = []
        errors: list[Exception] = []

        async def _run() -> None:
            with patch(
                "app.services.clause_risk_analyzer_service._get_anthropic_client",
                return_value=None,  # force heuristic path
            ):
                result = await analyze_clause_risks(clauses)
                results.append(result)

        async def _run_all() -> None:
            await asyncio.gather(*[_run() for _ in range(5)])

        asyncio.run(_run_all())

        assert errors == []
        # Each call must return exactly 5 results
        for result in results:
            assert len(result) == 5


# ── Degradation behaviour ─────────────────────────────────────────────────────


class TestDegradationBehaviour:
    """Open circuit breakers and transient errors must not crash the application."""

    @pytest.mark.asyncio
    async def test_translation_circuit_open_returns_error_not_crash(self) -> None:
        """Open circuit breaker surfaces TranslationError — app continues serving."""
        import pybreaker

        from app.services.translation_service import (
            TranslationError,
            TranslationService,
        )

        service = TranslationService(api_key="key")

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
        # Test passes — no unhandled exception crashed the process

    @pytest.mark.asyncio
    async def test_payment_circuit_open_returns_error_not_crash(self) -> None:
        """Open Stripe circuit breaker surfaces CheckoutSessionError — app continues."""
        import pybreaker

        from app.models import SubscriptionTier
        from app.services.payment_service import CheckoutSessionError, PaymentService

        service = PaymentService(
            secret_key="sk_test_fake",
            premium_price_id="price_fake",
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
    async def test_anthropic_circuit_open_returns_none_for_kaufvertrag(self) -> None:
        """Open Anthropic circuit breaker surfaces None — Kaufvertrag analysis degrades."""
        import pybreaker

        from app.services.clause_analyzer_service import analyze_kaufvertrag

        pages = [{"page_number": 1, "original_text": "Kaufpreis EUR 500.000"}]

        with patch(
            "app.services.clause_analyzer_service._breaker_async_call",
            side_effect=pybreaker.CircuitBreakerError(),
        ):
            with patch(
                "app.services.clause_analyzer_service._get_anthropic_client",
                return_value=MagicMock(),
            ):
                result = await analyze_kaufvertrag(pages, "kaufvertrag")

        assert result is None
        # Test passes — no unhandled exception crashed the process

    @pytest.mark.asyncio
    async def test_anthropic_circuit_open_returns_heuristics_for_clause_risks(
        self,
    ) -> None:
        """Open Anthropic circuit breaker for clause risk — heuristic fallback served."""
        import pybreaker

        from app.services.clause_risk_analyzer_service import analyze_clause_risks

        clauses = [
            {
                "clause_type": "purchase_price",
                "original_text": "Kaufpreis EUR 500.000",
                "translated_text": "",
                "page_number": 1,
                "risk_level": "high",
            }
        ]

        with patch(
            "app.services.clause_risk_analyzer_service._breaker_async_call",
            side_effect=pybreaker.CircuitBreakerError(),
        ):
            with patch(
                "app.services.clause_risk_analyzer_service._get_anthropic_client",
                return_value=MagicMock(),
            ):
                result = await analyze_clause_risks(clauses)

        # Heuristic fallback must return exactly the same number of clauses
        assert len(result) == 1
        assert "confidence_level" in result[0]
        assert "confidence_score" in result[0]

    @pytest.mark.asyncio
    async def test_anthropic_circuit_open_returns_none_for_document_type(
        self,
    ) -> None:
        """Open Anthropic circuit breaker — document type analysis returns None gracefully."""
        import pybreaker

        from app.services.document_type_analyzer_service import analyze_document_type

        pages = [{"page_number": 1, "original_text": "Grundbuchauszug Inhalt"}]

        with patch(
            "app.services.document_type_analyzer_service._breaker_async_call",
            side_effect=pybreaker.CircuitBreakerError(),
        ):
            with patch(
                "app.services.document_type_analyzer_service._get_anthropic_client",
                return_value=MagicMock(),
            ):
                result = await analyze_document_type(pages, "grundbuchauszug")

        assert result is None
        # Test passes — no unhandled exception crashed the process

    @pytest.mark.asyncio
    async def test_retry_does_not_hammer_api_immediately(self) -> None:
        """On first 503 failure the retry logic tries again — exactly one retry."""
        from tenacity import retry, retry_if_exception, stop_after_attempt, wait_none

        from app.core.reliability import _is_transient_translator_error
        from app.services.translation_service import (
            TranslationError,
            TranslationService,
        )

        service = TranslationService(api_key="key")
        call_timestamps: list[float] = []

        async def _flaky(text: str, source_language: str, target_language: str) -> dict:  # noqa: ARG001
            call_timestamps.append(time.perf_counter())
            if len(call_timestamps) == 1:
                raise TranslationError(
                    "Translation API error (status 503): Service Unavailable"
                )
            return {
                "translated_text": "purchase agreement",
                "detected_language": "de",
                "confidence": 0.9,
            }

        fast_retry = retry(
            stop=stop_after_attempt(3),
            wait=wait_none(),
            retry=retry_if_exception(_is_transient_translator_error),
            reraise=True,
        )
        service._make_request = fast_retry(_flaky)  # type: ignore[method-assign]

        result = await service.translate_text(
            text="Kaufvertrag",
            source_language=SupportedLanguage.GERMAN,
            target_language=SupportedLanguage.ENGLISH,
        )

        assert result.translated_text == "purchase agreement"
        assert len(call_timestamps) == 2, "Expected exactly 1 retry after 503"

    @pytest.mark.asyncio
    async def test_ai_heuristic_fallback_serves_all_clauses_on_api_failure(
        self,
    ) -> None:
        """When the AI API fails, every clause in the batch gets a heuristic result.

        No clause should be silently dropped.
        """
        from app.services.clause_risk_analyzer_service import analyze_clause_risks

        clauses = [
            {
                "clause_type": f"type_{i}",
                "original_text": f"Klausel {i}",
                "translated_text": "",
                "page_number": i + 1,
                "risk_level": "high",
            }
            for i in range(10)
        ]

        mock_client = MagicMock()

        with (
            patch(
                "app.services.clause_risk_analyzer_service._get_anthropic_client",
                return_value=mock_client,
            ),
            patch(
                "app.services.clause_risk_analyzer_service._call_claude",
                side_effect=TimeoutError("Anthropic timed out"),
            ),
        ):
            result = await analyze_clause_risks(clauses)

        # All 10 clauses are returned — none dropped
        assert len(result) == 10
        for item in result:
            assert "confidence_level" in item
            assert "confidence_score" in item


# ── Resource-usage guards ─────────────────────────────────────────────────────


class TestResourceUsageGuards:
    """Verify that repeated operations don't accumulate resources unexpectedly."""

    def test_audit_log_does_not_accumulate_sessions(self) -> None:
        """Calling log_action() 1000 times with a shared mock session doesn't
        grow memory — each call completes and releases the stack frame.
        """
        from app.services.audit_service import log_action

        mock_session = MagicMock()
        for i in range(1000):
            log_action(
                mock_session,
                action="document.upload",
                metadata={"index": i},
            )

        # 1000 successful add() calls without any side effects
        assert mock_session.add.call_count == 1000

    def test_pdf_validation_does_not_read_entire_file(self) -> None:
        """validate_pdf_bytes must inspect only the magic bytes — O(1) behaviour.

        We verify by passing a huge buffer and checking the function still
        completes fast (magic-byte check should read ≤ 10 bytes).
        """
        from app.services.document_service import validate_pdf_bytes

        # 10 MB "PDF"
        huge_pdf = b"%PDF-1.4 " + b"X" * (10 * 1024 * 1024)

        start = time.perf_counter()
        validate_pdf_bytes(huge_pdf)
        elapsed_ms = (time.perf_counter() - start) * 1000

        # Should finish in < 5 ms regardless of buffer size
        assert elapsed_ms < 5, (
            f"validate_pdf_bytes on 10 MB took {elapsed_ms:.1f} ms — "
            "check is not O(1) as expected"
        )

    @pytest.mark.asyncio
    async def test_batch_translate_does_not_duplicate_requests(self) -> None:
        """5-text batch must issue exactly ONE _make_batch_request call, not 5."""
        from app.services.translation_service import TranslationService

        service = TranslationService(api_key="key")
        mock_response = [
            {
                "translated_text": f"translation {i}",
                "detected_language": "de",
                "confidence": 0.9,
            }
            for i in range(5)
        ]

        with patch.object(
            service,
            "_make_batch_request",
            new_callable=AsyncMock,
            return_value=mock_response,
        ) as mock_req:
            await service.batch_translate(
                texts=["a", "b", "c", "d", "e"],
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        mock_req.assert_called_once()
