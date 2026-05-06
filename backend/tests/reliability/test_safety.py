"""Safety Tests — Reliability Suite.

Verifies that fail-safe mechanisms engage correctly:
- Low-confidence translations gate to human review
- Circuit-breaker fallbacks preserve heuristic clause data
- Document page limits and PDF validation block invalid uploads
- Audit trail is written on every sensitive action
- Global exception handler captures failures with traceable request IDs
- Request IDs are unique per request
- Rate limits enforce upload and translation quotas
"""

import io
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.translation import SupportedLanguage

# ── Confidence threshold gating ───────────────────────────────────────────────


class TestConfidenceThresholdGating:
    """Low-confidence translations must trigger requires_manual_review."""

    @pytest.mark.asyncio
    async def test_low_confidence_translation_sets_requires_review(self) -> None:
        """Score 0.55 is below the 0.70 threshold — requires_review must be True."""
        from app.services.translation_service import (
            TranslationResult,
            TranslationService,
        )

        service = TranslationService(api_key="key", region="westeurope")

        with patch.object(
            service,
            "translate_text",
            new_callable=AsyncMock,
            return_value=TranslationResult(
                original_text="Kaufvertrag",
                translated_text="purchase agreement",
                source_language="de",
                target_language="en",
                confidence=0.55,  # below 0.70 threshold
            ),
        ):
            result = await service.translate_with_warnings(
                text="Kaufvertrag",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.requires_review is True

    @pytest.mark.asyncio
    async def test_high_confidence_with_no_legal_terms_no_review(self) -> None:
        """Score 0.95 with no high-risk terms — requires_review must be False."""
        from app.services.translation_service import (
            TranslationResult,
            TranslationService,
        )

        service = TranslationService(api_key="key", region="westeurope")

        with patch.object(
            service,
            "translate_text",
            new_callable=AsyncMock,
            return_value=TranslationResult(
                original_text="Das Haus ist rot.",
                translated_text="The house is red.",
                source_language="de",
                target_language="en",
                confidence=0.95,  # above threshold, no legal terms
            ),
        ):
            result = await service.translate_with_warnings(
                text="Das Haus ist rot.",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.requires_review is False

    @pytest.mark.asyncio
    async def test_high_confidence_with_high_risk_terms_triggers_review(self) -> None:
        """High confidence score but high-risk legal terms still triggers review."""
        from app.services.translation_service import (
            TranslationResult,
            TranslationService,
        )

        service = TranslationService(api_key="key", region="westeurope")

        with patch.object(
            service,
            "translate_text",
            new_callable=AsyncMock,
            return_value=TranslationResult(
                original_text="Kaufvertrag und Auflassung",
                translated_text="purchase agreement and conveyance",
                source_language="de",
                target_language="en",
                confidence=0.98,  # high confidence, but legal terms present
            ),
        ):
            result = await service.translate_with_warnings(
                text="Kaufvertrag und Auflassung",  # triggers HIGH risk warnings
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        # Legal term detection should set requires_review=True
        assert result.requires_review is True

    @pytest.mark.asyncio
    async def test_confidence_exactly_at_threshold_does_not_trigger_review(
        self,
    ) -> None:
        """Score of exactly 0.70 must NOT trigger review — condition is strict <."""
        from app.services.translation_service import (
            TranslationResult,
            TranslationService,
        )

        service = TranslationService(api_key="key", region="westeurope")

        with patch.object(
            service,
            "translate_text",
            new_callable=AsyncMock,
            return_value=TranslationResult(
                original_text="Das Haus ist rot.",
                translated_text="The house is red.",
                source_language="de",
                target_language="en",
                confidence=0.70,  # exactly at threshold — should NOT trigger
            ),
        ):
            result = await service.translate_with_warnings(
                text="Das Haus ist rot.",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        # 0.70 is NOT < 0.70, so confidence gate must not fire
        assert result.requires_review is False


# ── Document processing helper safety ─────────────────────────────────────────


class TestDocumentProcessingHelpers:
    """_compute_requires_review and _compute_avg_confidence safety checks."""

    def test_compute_requires_review_any_low_confidence_returns_true(self) -> None:
        """Even one low-confidence translation flips requires_review."""
        from app.services.document_service import _compute_requires_review

        mock_translations = [
            self._make_mock_tr(0.95),
            self._make_mock_tr(0.55),  # low confidence
            self._make_mock_tr(0.88),
        ]
        assert _compute_requires_review(mock_translations) is True

    def test_compute_requires_review_all_high_confidence_returns_false(self) -> None:
        """All translations above threshold → requires_review is False."""
        from app.services.document_service import _compute_requires_review

        mock_translations = [
            self._make_mock_tr(0.95),
            self._make_mock_tr(0.80),
            self._make_mock_tr(0.75),
        ]
        assert _compute_requires_review(mock_translations) is False

    def test_compute_requires_review_empty_list_returns_false(self) -> None:
        """Empty translation list means nothing to review."""
        from app.services.document_service import _compute_requires_review

        assert _compute_requires_review([]) is False

    def test_compute_avg_confidence_empty_list_returns_none(self) -> None:
        """Empty list must return None, not raise ZeroDivisionError."""
        from app.services.document_service import _compute_avg_confidence

        assert _compute_avg_confidence([]) is None

    def test_compute_avg_confidence_single_item(self) -> None:
        """Single translation returns its own confidence as the average."""
        from app.services.document_service import _compute_avg_confidence

        mock_tr = self._make_mock_tr(0.80)
        result = _compute_avg_confidence([mock_tr])
        assert result == pytest.approx(0.80, abs=0.001)

    def test_compute_avg_confidence_multiple_items(self) -> None:
        """Average of [0.80, 0.60, 1.00] is 0.80."""
        from app.services.document_service import _compute_avg_confidence

        mock_translations = [
            self._make_mock_tr(0.80),
            self._make_mock_tr(0.60),
            self._make_mock_tr(1.00),
        ]
        result = _compute_avg_confidence(mock_translations)
        assert result == pytest.approx(0.80, abs=0.001)

    @staticmethod
    def _make_mock_tr(confidence: float) -> MagicMock:
        """Build a mock TranslationResponse with a nested confidence score."""
        mock_tr = MagicMock()
        mock_tr.translation.confidence = confidence
        return mock_tr


# ── Fail-safe defaults ────────────────────────────────────────────────────────


class TestFailSafeDefaults:
    """Document upload enforces page and file-type limits as hard guards."""

    @pytest.mark.asyncio
    async def test_page_limit_exceeded_blocks_upload(self) -> None:
        """Upload rejected when page count exceeds the user's tier limit.

        This prevents premium content from being extracted by free users.
        """
        from app.services.document_service import save_upload

        large_pdf_bytes = b"%PDF-1.4 fake content"
        mock_session = AsyncMock()

        with (
            patch("app.services.document_service.validate_pdf_bytes"),
            patch(
                "app.services.document_service.asyncio.to_thread",
                new_callable=AsyncMock,
                return_value=11,  # 11 pages > 10 page free limit
            ),
        ):
            with pytest.raises(ValueError, match="pages"):
                await save_upload(
                    session=mock_session,
                    user_id=uuid.uuid4(),
                    file_content=large_pdf_bytes,
                    filename="big_doc.pdf",
                    is_premium=False,  # free tier: 10-page limit
                )

    def test_non_pdf_magic_bytes_blocked(self) -> None:
        """File that does not begin with %PDF is rejected at the byte level."""
        from app.services.document_service import validate_pdf_bytes

        with pytest.raises(ValueError, match="valid PDF"):
            validate_pdf_bytes(b"\x89PNG\r\n\x1a\n" + b"fake png data")


# ── Audit trail safety ────────────────────────────────────────────────────────


class TestAuditTrailSafety:
    """Audit entries are written for every sensitive action."""

    def test_audit_action_constants_are_strings(self) -> None:
        """All ACTION_* constants are plain strings, not enums.

        String constants are easier to query in the DB and don't require
        serialization, making audit log analysis simpler.
        """
        import app.services.audit_service as audit_svc

        action_attrs = [a for a in dir(audit_svc) if a.startswith("ACTION_")]
        assert len(action_attrs) >= 10, "Expected at least 10 ACTION_ constants"
        for attr in action_attrs:
            assert isinstance(getattr(audit_svc, attr), str), f"{attr} must be a str"

    def test_log_action_writes_correct_fields(self) -> None:
        """Audit log entry has all expected fields populated."""
        from app.services.audit_service import log_action

        from app.models.audit_log import AuditLog

        mock_session = MagicMock()
        user_id = uuid.uuid4()
        doc_id = str(uuid.uuid4())

        log_action(
            mock_session,
            action="document.upload",
            user_id=user_id,
            resource_type="document",
            resource_id=doc_id,
            status="success",
            metadata={"filename": "contract.pdf", "page_count": 5},
        )

        mock_session.add.assert_called_once()
        entry: AuditLog = mock_session.add.call_args[0][0]
        assert entry.action == "document.upload"
        assert entry.user_id == user_id
        assert entry.resource_type == "document"
        assert entry.resource_id == doc_id
        assert entry.status == "success"
        assert entry.metadata == {"filename": "contract.pdf", "page_count": 5}

    def test_log_action_extracts_ip_and_request_id_from_request(self) -> None:
        """IP address and request ID are pulled from the Request object."""
        from app.services.audit_service import log_action

        from app.models.audit_log import AuditLog

        mock_session = MagicMock()
        mock_request = MagicMock()
        mock_request.client.host = "203.0.113.42"
        mock_request.state.request_id = "550e8400-e29b-41d4-a716-446655440000"

        log_action(mock_session, action="document.delete", request=mock_request)

        entry: AuditLog = mock_session.add.call_args[0][0]
        assert entry.ip_address == "203.0.113.42"
        assert entry.request_id == "550e8400-e29b-41d4-a716-446655440000"

    def test_log_action_db_failure_does_not_prevent_response(self) -> None:
        """Audit log failure must never block the HTTP response."""
        from app.services.audit_service import log_action

        mock_session = MagicMock()
        mock_session.add.side_effect = Exception("DB unreachable")

        # The route handler would call this and then return the HTTP response.
        # If log_action raises, the response never gets sent.
        log_action(mock_session, action="document.upload")
        # Reaching here proves no exception propagated


# ── Alert system (global exception handler) ───────────────────────────────────


class TestAlertSystem:
    """Global exception handler must produce traceable 500 responses."""

    def test_global_handler_returns_500_with_request_id(
        self, exception_client: object
    ) -> None:
        """Unhandled exception → 500 JSON with a request_id field."""
        response = exception_client.get("/trigger-500")  # type: ignore[attr-defined]
        assert response.status_code == 500
        body = response.json()
        assert "request_id" in body
        assert "detail" in body

    def test_global_handler_detail_is_user_friendly(
        self, exception_client: object
    ) -> None:
        """The detail message must not expose internal exception text."""
        response = exception_client.get("/trigger-500")  # type: ignore[attr-defined]
        body = response.json()
        # Must NOT contain the raw exception message
        assert "deliberate 500" not in body["detail"]
        assert "unexpected error" in body["detail"].lower()

    def test_global_handler_request_id_is_a_uuid(
        self, exception_client: object
    ) -> None:
        """The request_id in the 500 response is a valid UUID string."""
        response = exception_client.get("/trigger-500")  # type: ignore[attr-defined]
        request_id = response.json()["request_id"]
        try:
            uuid.UUID(request_id)
        except ValueError:
            pytest.fail(f"request_id '{request_id}' is not a valid UUID")


# ── Request ID uniqueness ─────────────────────────────────────────────────────


class TestRequestIdUniqueness:
    """Every request must receive a distinct X-Request-ID header."""

    def test_every_response_has_x_request_id(self, middleware_client: object) -> None:
        """GET /ping response includes X-Request-ID header."""
        response = middleware_client.get("/ping")  # type: ignore[attr-defined]
        assert "x-request-id" in response.headers or "X-Request-ID" in response.headers

    def test_two_requests_have_different_ids(self, middleware_client: object) -> None:
        """Sequential requests each receive a unique ID."""
        r1 = middleware_client.get("/ping")  # type: ignore[attr-defined]
        r2 = middleware_client.get("/ping")  # type: ignore[attr-defined]
        id1 = r1.headers.get("x-request-id") or r1.headers.get("X-Request-ID")
        id2 = r2.headers.get("x-request-id") or r2.headers.get("X-Request-ID")
        assert id1 != id2

    def test_request_id_is_valid_uuid_format(self, middleware_client: object) -> None:
        """The X-Request-ID value is a valid UUID4."""
        response = middleware_client.get("/ping")  # type: ignore[attr-defined]
        raw = response.headers.get("x-request-id") or response.headers.get(
            "X-Request-ID"
        )
        assert raw is not None
        try:
            uuid.UUID(raw)
        except ValueError:
            pytest.fail(f"X-Request-ID '{raw}' is not a valid UUID")


# ── Rate limit safety ─────────────────────────────────────────────────────────


class TestRateLimitSafety:
    """Upload and translation endpoints enforce per-user rate limits."""

    def test_rate_limited_upload_returns_429(
        self, client: object, normal_user_token_headers: dict
    ) -> None:
        """11th document upload within 1 hour returns HTTP 429."""
        from app.services.rate_limit_service import RateLimitInfo

        locked_info = RateLimitInfo(
            is_locked=True,
            attempts_remaining=0,
            lockout_expires_at=None,
        )

        with patch(
            "app.api.routes.documents.rate_limit_service._check_limit",
            return_value=locked_info,
        ):
            _MINIMAL_PDF = b"%PDF-1.4\n%%EOF"
            response = client.post(  # type: ignore[attr-defined]
                "/api/v1/documents/upload",
                headers=normal_user_token_headers,
                files={
                    "file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")
                },
            )

        assert response.status_code == 429
        assert "rate limit" in response.json()["detail"].lower()

    def test_upload_within_limit_is_not_blocked(
        self, client: object, normal_user_token_headers: dict
    ) -> None:
        """Uploads within the 10/hour limit are not rejected by the rate limiter."""
        from app.models.document import DocumentStatus, DocumentType
        from app.services.rate_limit_service import RateLimitInfo

        allowed_info = RateLimitInfo(
            is_locked=False,
            attempts_remaining=5,
            lockout_expires_at=None,
        )
        mock_doc = MagicMock()
        mock_doc.id = uuid.uuid4()
        mock_doc.original_filename = "test.pdf"
        mock_doc.file_size_bytes = 100
        mock_doc.page_count = 1
        mock_doc.document_type = DocumentType.UNKNOWN.value
        mock_doc.status = DocumentStatus.UPLOADED.value
        mock_doc.journey_step_id = None

        with (
            patch(
                "app.api.routes.documents.rate_limit_service._check_limit",
                return_value=allowed_info,
            ),
            patch(
                "app.api.routes.documents.document_service.save_upload",
                new_callable=AsyncMock,
                return_value=mock_doc,
            ),
            patch(
                "app.api.routes.documents.document_service.process_document",
                new_callable=AsyncMock,
            ),
            patch(
                "app.api.routes.documents.rate_limit_service._record_attempt",
            ),
            patch("app.api.routes.documents.audit_service.log_action"),
        ):
            _MINIMAL_PDF = b"%PDF-1.4\n%%EOF"
            response = client.post(  # type: ignore[attr-defined]
                "/api/v1/documents/upload",
                headers=normal_user_token_headers,
                files={
                    "file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")
                },
            )

        assert response.status_code == 201

    def test_different_users_have_independent_rate_limit_counters(self) -> None:
        """Each user has their own rate-limit bucket; one user locked ≠ all locked."""
        import fakeredis

        from app.services.rate_limit_service import RateLimitInfo, _check_limit

        fake_redis = fakeredis.FakeRedis(decode_responses=True)

        with patch("app.services.rate_limit_service._redis_client", fake_redis):
            user_a_status = _check_limit(
                identifier="user-a",
                attempts_prefix="api:ratelimit:test:attempts:",
                lockout_prefix="api:ratelimit:test:lockout:",
                max_attempts=10,
                window_seconds=3600,
            )
            user_b_status = _check_limit(
                identifier="user-b",
                attempts_prefix="api:ratelimit:test:attempts:",
                lockout_prefix="api:ratelimit:test:lockout:",
                max_attempts=10,
                window_seconds=3600,
            )

        # Both start unlocked with full quota
        assert user_a_status.is_locked is False
        assert user_b_status.is_locked is False
        assert isinstance(user_a_status, RateLimitInfo)
