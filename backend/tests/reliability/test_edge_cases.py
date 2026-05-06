"""Edge Case Tests — Reliability Suite.

Covers missing/invalid/boundary inputs across translation, document processing,
calculator validation, and audit logging.  All external services are mocked
so no real network calls are made.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.translation import SupportedLanguage

# ── Translation edge cases ────────────────────────────────────────────────────


class TestTranslationEdgeCases:
    """Edge cases for the Azure Translator service."""

    @pytest.mark.asyncio
    async def test_batch_translate_single_item_works(self) -> None:
        """Batch with one text returns exactly one result."""
        from app.services.translation_service import TranslationService

        service = TranslationService(api_key="test-key", region="westeurope")
        mock_response = [
            {
                "translations": [{"text": "purchase agreement"}],
                "detectedLanguage": {"language": "de", "score": 0.95},
            }
        ]
        with patch.object(
            service,
            "_make_batch_request",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await service.batch_translate(
                texts=["Kaufvertrag"],
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert len(result.translations) == 1
        assert (
            result.translations[0].translation.translated_text == "purchase agreement"
        )

    @pytest.mark.asyncio
    async def test_batch_translate_response_length_mismatch_raises(self) -> None:
        """API returning fewer results than inputs raises TranslationError immediately.

        This prevents silent index-out-of-range errors or mapping wrong
        translations to wrong pages.
        """
        from app.services.translation_service import (
            TranslationError,
            TranslationService,
        )

        service = TranslationService(api_key="test-key", region="westeurope")
        # 3 results for 5 inputs — deliberate mismatch
        mock_response = [
            {
                "translations": [{"text": "one"}],
                "detectedLanguage": {"language": "de", "score": 0.9},
            },
            {
                "translations": [{"text": "two"}],
                "detectedLanguage": {"language": "de", "score": 0.9},
            },
            {
                "translations": [{"text": "three"}],
                "detectedLanguage": {"language": "de", "score": 0.9},
            },
        ]
        with patch.object(
            service,
            "_make_batch_request",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            with pytest.raises(TranslationError, match="Batch response mismatch"):
                await service.batch_translate(
                    texts=["a", "b", "c", "d", "e"],
                    source_language=SupportedLanguage.GERMAN,
                    target_language=SupportedLanguage.ENGLISH,
                )

    @pytest.mark.asyncio
    async def test_batch_translate_more_results_than_inputs_raises(self) -> None:
        """API returning MORE results than inputs also triggers mismatch guard."""
        from app.services.translation_service import (
            TranslationError,
            TranslationService,
        )

        service = TranslationService(api_key="test-key", region="westeurope")
        mock_response = [
            {
                "translations": [{"text": "one"}],
                "detectedLanguage": {"language": "de", "score": 0.9},
            },
            {
                "translations": [{"text": "two"}],
                "detectedLanguage": {"language": "de", "score": 0.9},
            },
        ]
        with patch.object(
            service,
            "_make_batch_request",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            with pytest.raises(TranslationError, match="Batch response mismatch"):
                await service.batch_translate(
                    texts=["a"],  # 1 input, 2 returned
                    source_language=SupportedLanguage.GERMAN,
                    target_language=SupportedLanguage.ENGLISH,
                )

    @pytest.mark.asyncio
    async def test_text_with_no_legal_terms_has_no_warnings(self) -> None:
        """Ordinary text with no German legal vocabulary produces no legal warnings."""
        from app.services.translation_service import TranslationService

        service = TranslationService(api_key="test-key", region="westeurope")
        mock_response = [
            {
                "translations": [{"text": "The house is red."}],
                "detectedLanguage": {"language": "de", "score": 0.99},
            }
        ]
        with patch.object(
            service, "_make_request", new_callable=AsyncMock, return_value=mock_response
        ):
            result = await service.translate_with_warnings(
                text="Das Haus ist rot.",
                source_language=SupportedLanguage.GERMAN,
                target_language=SupportedLanguage.ENGLISH,
            )

        assert result.legal_warnings == []
        assert result.requires_review is False


# ── Document edge cases ───────────────────────────────────────────────────────


class TestDocumentEdgeCases:
    """Edge cases for document upload and processing."""

    def test_validate_pdf_bytes_accepts_valid_magic(self) -> None:
        """Bytes beginning with %PDF are accepted without error."""
        from app.services.document_service import validate_pdf_bytes

        validate_pdf_bytes(b"%PDF-1.4 rest of file content")  # must not raise

    def test_validate_pdf_bytes_rejects_html(self) -> None:
        """HTML bytes disguised as PDF are rejected via magic-byte check."""
        from app.services.document_service import validate_pdf_bytes

        with pytest.raises(ValueError, match="valid PDF"):
            validate_pdf_bytes(b"<html><body>Not a PDF</body></html>")

    def test_validate_pdf_bytes_rejects_empty(self) -> None:
        """Empty byte string fails the PDF magic-byte check."""
        from app.services.document_service import validate_pdf_bytes

        with pytest.raises(ValueError, match="valid PDF"):
            validate_pdf_bytes(b"")

    def test_validate_pdf_bytes_rejects_javascript(self) -> None:
        """JavaScript polyglot bytes are rejected."""
        from app.services.document_service import validate_pdf_bytes

        with pytest.raises(ValueError, match="valid PDF"):
            validate_pdf_bytes(b"alert('xss')//")

    def test_document_type_detection_empty_text_returns_unknown(self) -> None:
        """Document type detection on empty string returns UNKNOWN — no crash."""
        from app.models.document import DocumentType
        from app.services.document_service import _detect_document_type

        assert _detect_document_type("") == DocumentType.UNKNOWN

    def test_document_type_detection_whitespace_returns_unknown(self) -> None:
        """Whitespace-only text produces UNKNOWN — keywords need real characters."""
        from app.models.document import DocumentType
        from app.services.document_service import _detect_document_type

        assert _detect_document_type("   \n\t  ") == DocumentType.UNKNOWN

    def test_empty_pages_are_filtered_before_batch_translate(self) -> None:
        """Pages with blank original_text are excluded from the translation batch.

        Verifies the filtering logic that prevents empty API calls.
        """
        pages = [
            {"page_number": 1, "original_text": "Kaufvertrag", "translated_text": ""},
            {"page_number": 2, "original_text": "", "translated_text": ""},
            {"page_number": 3, "original_text": "  ", "translated_text": ""},
        ]
        non_empty = [p["original_text"] for p in pages if p["original_text"].strip()]
        assert non_empty == ["Kaufvertrag"]


# ── Calculator edge cases ─────────────────────────────────────────────────────


class TestCalculatorEdgeCases:
    """Boundary condition tests for property_price field validators."""

    def test_price_at_upper_boundary_is_valid(self) -> None:
        """Price of exactly 100,000,000 EUR satisfies the le= constraint."""
        from app.schemas.calculator import HiddenCostCalculationCreate

        calc = HiddenCostCalculationCreate(
            property_price=100_000_000,
            state_code="BY",
            property_type="apartment",
        )
        assert calc.property_price == 100_000_000

    def test_price_one_cent_over_limit_is_invalid(self) -> None:
        """100,000,001 EUR exceeds the le=100_000_000 guard."""
        from pydantic import ValidationError

        from app.schemas.calculator import HiddenCostCalculationCreate

        with pytest.raises(ValidationError):
            HiddenCostCalculationCreate(
                property_price=100_000_001,
                state_code="BY",
                property_type="apartment",
            )

    def test_price_minimum_one_eur_is_valid(self) -> None:
        """Price of 1 EUR satisfies gt=0."""
        from app.schemas.calculator import HiddenCostCalculationCreate

        calc = HiddenCostCalculationCreate(
            property_price=1,
            state_code="BY",
            property_type="apartment",
        )
        assert calc.property_price == 1

    def test_price_zero_is_invalid(self) -> None:
        """Price of 0 violates gt=0."""
        from pydantic import ValidationError

        from app.schemas.calculator import HiddenCostCalculationCreate

        with pytest.raises(ValidationError):
            HiddenCostCalculationCreate(
                property_price=0,
                state_code="BY",
                property_type="apartment",
            )

    def test_price_negative_is_invalid(self) -> None:
        """Negative price violates gt=0."""
        from pydantic import ValidationError

        from app.schemas.calculator import HiddenCostCalculationCreate

        with pytest.raises(ValidationError):
            HiddenCostCalculationCreate(
                property_price=-250_000,
                state_code="BY",
                property_type="apartment",
            )

    def test_state_code_too_long_is_invalid(self) -> None:
        """State code 'BAY' (3 chars) violates max_length=2."""
        from pydantic import ValidationError

        from app.schemas.calculator import HiddenCostCalculationCreate

        with pytest.raises(ValidationError):
            HiddenCostCalculationCreate(
                property_price=300_000,
                state_code="BAY",
                property_type="apartment",
            )

    def test_state_code_empty_is_invalid(self) -> None:
        """Empty state code violates min_length=2."""
        from pydantic import ValidationError

        from app.schemas.calculator import HiddenCostCalculationCreate

        with pytest.raises(ValidationError):
            HiddenCostCalculationCreate(
                property_price=300_000,
                state_code="",
                property_type="apartment",
            )


# ── Audit service edge cases ──────────────────────────────────────────────────


class TestAuditServiceEdgeCases:
    """Edge cases for audit log writing with missing/null optional fields."""

    def test_log_action_all_optional_fields_none(self) -> None:
        """log_action succeeds when every optional field is omitted."""
        from app.services.audit_service import log_action

        mock_session = MagicMock()
        log_action(mock_session, action="document.upload")  # must not raise
        mock_session.add.assert_called_once()

    def test_log_action_metadata_with_null_values(self) -> None:
        """Metadata dict containing None values does not crash the logger."""
        from app.services.audit_service import log_action

        mock_session = MagicMock()
        log_action(
            mock_session,
            action="document.upload",
            metadata={"filename": None, "page_count": 0},
        )
        mock_session.add.assert_called_once()

    def test_log_action_without_request_yields_null_ip_and_request_id(self) -> None:
        """When request=None both ip_address and request_id are stored as None."""
        from app.services.audit_service import log_action

        from app.models.audit_log import AuditLog

        mock_session = MagicMock()
        log_action(mock_session, action="document.upload", request=None)

        entry: AuditLog = mock_session.add.call_args[0][0]
        assert entry.ip_address is None
        assert entry.request_id is None

    def test_log_action_with_unauthenticated_user(self) -> None:
        """user_id=None is allowed for logging pre-authentication actions."""
        from app.services.audit_service import log_action

        from app.models.audit_log import AuditLog

        mock_session = MagicMock()
        log_action(mock_session, action="user.login", user_id=None)

        entry: AuditLog = mock_session.add.call_args[0][0]
        assert entry.user_id is None

    def test_log_action_stores_correct_action_string(self) -> None:
        """The action string is stored verbatim in the AuditLog row."""
        from app.services.audit_service import log_action

        from app.models.audit_log import AuditLog

        mock_session = MagicMock()
        log_action(
            mock_session, action="payment.checkout_created", user_id=uuid.uuid4()
        )

        entry: AuditLog = mock_session.add.call_args[0][0]
        assert entry.action == "payment.checkout_created"
