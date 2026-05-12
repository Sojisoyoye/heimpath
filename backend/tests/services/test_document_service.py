"""Tests for document upload and translation service."""

import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.document import Document, DocumentStatus, DocumentType
from app.models.notification import NotificationType
from app.services import document_service
from app.services.document_service import (
    _detect_clauses,
    _detect_document_type,
    get_documents_by_step_id,
    mark_stuck_documents_failed,
    validate_pdf_bytes,
)

# --- Document type detection tests ---


class TestDetectDocumentType:
    def test_kaufvertrag(self) -> None:
        text = "Dieser Kaufvertrag regelt die Veräußerung des Grundstücks. Der Kaufpreis beträgt EUR 350.000."
        assert _detect_document_type(text) == DocumentType.KAUFVERTRAG

    def test_mietvertrag(self) -> None:
        text = "Mietvertrag zwischen Vermieter und Mieter. Die Kaltmiete beträgt EUR 1200. Kaution: 3 Monatsmieten."
        assert _detect_document_type(text) == DocumentType.MIETVERTRAG

    def test_expose(self) -> None:
        text = "Exposé: Objektbeschreibung einer 3-Zimmer Wohnung. Wohnfläche 85qm, Baujahr 1995. Energieausweis vorhanden."
        assert _detect_document_type(text) == DocumentType.EXPOSE

    def test_grundbuchauszug(self) -> None:
        text = "Grundbuchauszug Abteilung I: Eigentümer. Flurstück 123. Bestandsverzeichnis."
        assert _detect_document_type(text) == DocumentType.GRUNDBUCHAUSZUG

    def test_nebenkostenabrechnung(self) -> None:
        text = "Nebenkostenabrechnung 2024. Heizkosten: EUR 800. Hausgeld gesamt."
        assert _detect_document_type(text) == DocumentType.NEBENKOSTENABRECHNUNG

    def test_teilungserklaerung(self) -> None:
        text = "Teilungserklärung: Sondereigentum und Gemeinschaftseigentum. Miteigentumsanteil 1/10."
        assert _detect_document_type(text) == DocumentType.TEILUNGSERKLAERUNG

    def test_hausgeldabrechnung(self) -> None:
        text = (
            "Hausgeldabrechnung und Wirtschaftsplan. Instandhaltungsrücklage: EUR 5000."
        )
        assert _detect_document_type(text) == DocumentType.HAUSGELDABRECHNUNG

    def test_unknown_text(self) -> None:
        text = "This is a generic English document with no German legal terms."
        assert _detect_document_type(text) == DocumentType.UNKNOWN

    def test_empty_text(self) -> None:
        assert _detect_document_type("") == DocumentType.UNKNOWN


# --- Clause detection tests ---


class TestDetectClauses:
    def test_purchase_price(self) -> None:
        text = "Der Kaufpreis beträgt EUR 350.000,00 und ist sofort fällig."
        clauses = _detect_clauses(text, page_number=1)
        assert len(clauses) >= 1
        assert clauses[0]["clause_type"] == "purchase_price"
        assert clauses[0]["risk_level"] == "high"
        assert clauses[0]["page_number"] == 1

    def test_deadline(self) -> None:
        text = "Die Frist 15.03.2025 muss eingehalten werden."
        clauses = _detect_clauses(text, page_number=2)
        assert len(clauses) >= 1
        assert clauses[0]["clause_type"] == "deadline"
        assert clauses[0]["risk_level"] == "high"

    def test_warranty_exclusion(self) -> None:
        text = "Die Gewährleistung wird ausgeschlossen. Der Käufer verzichtet."
        clauses = _detect_clauses(text, page_number=3)
        assert len(clauses) >= 1
        assert clauses[0]["clause_type"] == "warranty_exclusion"
        assert clauses[0]["risk_level"] == "high"

    def test_special_condition(self) -> None:
        text = (
            "Besondere Vereinbarung: Der Verkäufer verpflichtet sich zur Renovierung."
        )
        clauses = _detect_clauses(text, page_number=1)
        assert len(clauses) >= 1
        assert clauses[0]["clause_type"] == "special_condition"
        assert clauses[0]["risk_level"] == "medium"

    def test_financial_term(self) -> None:
        text = "Die Grundschuld in Höhe von EUR 200.000 wird eingetragen."
        clauses = _detect_clauses(text, page_number=1)
        assert len(clauses) >= 1
        assert clauses[0]["clause_type"] == "financial_term"
        assert clauses[0]["risk_level"] == "medium"

    def test_no_clauses_in_plain_text(self) -> None:
        text = "This is a simple text without any legal clauses."
        clauses = _detect_clauses(text, page_number=1)
        assert len(clauses) == 0

    def test_multiple_clauses(self) -> None:
        text = (
            "Der Kaufpreis beträgt EUR 500.000. "
            "Frist bis zum 01.06.2025. "
            "Gewährleistung wird ausgeschlossen."
        )
        clauses = _detect_clauses(text, page_number=1)
        assert len(clauses) >= 3
        types = {c["clause_type"] for c in clauses}
        assert "purchase_price" in types
        assert "deadline" in types
        assert "warranty_exclusion" in types

    def test_empty_text(self) -> None:
        assert _detect_clauses("", page_number=1) == []


# --- get_documents_by_step_id tests ---


def _make_document(
    user_id: uuid.UUID,
    journey_step_id: uuid.UUID | None = None,
) -> Document:
    """Create a Document instance for testing."""
    doc = Document(
        id=uuid.uuid4(),
        user_id=user_id,
        journey_step_id=journey_step_id,
        original_filename="test.pdf",
        stored_filename="abc_test.pdf",
        file_path="/tmp/abc_test.pdf",
        file_size_bytes=1024,
        page_count=2,
        document_type=DocumentType.KAUFVERTRAG.value,
        status=DocumentStatus.COMPLETED.value,
    )
    doc.created_at = datetime.now(timezone.utc)
    return doc


class TestGetDocumentsByStepId:
    @pytest.mark.asyncio
    async def test_returns_documents_for_step(self) -> None:
        user_id = uuid.uuid4()
        step_id = uuid.uuid4()
        doc = _make_document(user_id, step_id)

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [doc]

        mock_session = AsyncMock()
        mock_session.execute.return_value = mock_result

        result = await get_documents_by_step_id(mock_session, step_id, user_id)

        assert len(result) == 1
        assert result[0].journey_step_id == step_id
        mock_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_returns_empty_for_step_with_no_documents(self) -> None:
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_session = AsyncMock()
        mock_session.execute.return_value = mock_result

        result = await get_documents_by_step_id(
            mock_session, uuid.uuid4(), uuid.uuid4()
        )

        assert result == []

    @pytest.mark.asyncio
    async def test_query_filters_by_both_step_and_user(self) -> None:
        """Ensure the SQL query contains WHERE clauses for both step_id and user_id."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_session = AsyncMock()
        mock_session.execute.return_value = mock_result

        step_id = uuid.uuid4()
        user_id = uuid.uuid4()

        await get_documents_by_step_id(mock_session, step_id, user_id)

        # Extract the compiled SQL from the call args
        call_args = mock_session.execute.call_args
        query = call_args[0][0]
        compiled = str(query.compile(compile_kwargs={"literal_binds": False}))

        assert "document.journey_step_id" in compiled
        assert "document.user_id" in compiled
        assert "ORDER BY document.created_at DESC" in compiled


# ── M5: PDF magic-bytes validation ───────────────────────────────────────────


class TestValidatePdfBytes:
    def test_valid_pdf_passes(self) -> None:
        valid_pdf = b"%PDF-1.4 minimal content"
        # Should not raise
        validate_pdf_bytes(valid_pdf)

    def test_html_disguised_as_pdf_raises(self) -> None:
        html_bytes = b"<html><body>not a pdf</body></html>"
        with pytest.raises(ValueError, match="does not appear to be a valid PDF"):
            validate_pdf_bytes(html_bytes)

    def test_empty_bytes_raises(self) -> None:
        with pytest.raises(ValueError, match="does not appear to be a valid PDF"):
            validate_pdf_bytes(b"")

    def test_js_polyglot_raises(self) -> None:
        js_bytes = b"alert('xss');"
        with pytest.raises(ValueError, match="does not appear to be a valid PDF"):
            validate_pdf_bytes(js_bytes)


# ── M6: Stored filename path sanitization ────────────────────────────────────


class TestSaveUploadPathSanitization:
    @pytest.mark.asyncio
    async def test_stored_filename_is_uuid_only(self, tmp_path: Path) -> None:
        """Stored filename must be <uuid>.pdf — no original filename embedded."""
        minimal_pdf = (
            b"%PDF-1.4\n"
            b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>>\nendobj\n"
            b"xref\n0 4\n0000000000 65535 f\n"
            b"0000000009 00000 n\n0000000068 00000 n\n0000000125 00000 n\n"
            b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n197\n%%EOF"
        )
        mock_session = AsyncMock()
        mock_session.refresh = AsyncMock()

        with (
            patch.object(document_service.settings, "UPLOAD_DIR", str(tmp_path)),
            patch("app.services.document_service._count_pages_sync", return_value=1),
            patch(
                "app.services.document_service._extract_pages_sync",
                return_value=[
                    {"page_number": 1, "original_text": "", "translated_text": ""}
                ],
            ),
        ):
            doc = await document_service.save_upload(
                session=mock_session,
                user_id=uuid.uuid4(),
                file_content=minimal_pdf,
                filename="../../../etc/cron.d/evil",
                is_premium=False,
            )

        # Stored filename must be <hex>.pdf — no path components from original name
        assert doc.stored_filename.endswith(".pdf")
        assert ".." not in doc.stored_filename
        assert "/" not in doc.stored_filename
        assert doc.stored_filename == doc.stored_filename.split("/")[-1]
        # Original name is preserved in the DB field
        assert doc.original_filename == "../../../etc/cron.d/evil"
        # File must be inside tmp_path — no path traversal
        written_files = list(tmp_path.iterdir())
        assert len(written_files) == 1
        assert written_files[0].name == doc.stored_filename
        os.remove(written_files[0])


# ── process_document notification dispatch ───────────────────────────────────


def _make_process_document_mocks(
    document_id: uuid.UUID,
    user_id: uuid.UUID,
    doc_type: str = DocumentType.UNKNOWN.value,
) -> tuple[MagicMock, MagicMock]:
    """Build a mock async session and session factory for process_document tests."""
    doc = Document(
        id=document_id,
        user_id=user_id,
        original_filename="test.pdf",
        stored_filename="abc.pdf",
        file_path="/tmp/abc.pdf",
        file_size_bytes=1024,
        page_count=1,
        document_type=doc_type,
        status=DocumentStatus.PROCESSING.value,
    )
    doc.created_at = datetime.now(timezone.utc)

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = doc

    mock_session = AsyncMock()
    mock_session.execute.return_value = mock_result
    mock_session.commit = AsyncMock()
    mock_session.add = MagicMock()

    @asynccontextmanager
    async def _factory():
        yield mock_session

    return mock_session, _factory


def _make_sync_session_mock() -> MagicMock:
    """Create a mock sync session context manager (for SyncSession(engine) usage)."""
    mock_cm = MagicMock()
    mock_cm.__enter__ = MagicMock(return_value=mock_cm)
    mock_cm.__exit__ = MagicMock(return_value=False)
    return mock_cm


class TestProcessDocumentNotifications:
    @pytest.mark.asyncio
    async def test_sends_translation_failed_notification_on_processing_error(
        self,
    ) -> None:
        """Failure during processing dispatches a TRANSLATION_FAILED notification."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_session, session_factory = _make_process_document_mocks(
            document_id, user_id
        )
        mock_sync_cm = _make_sync_session_mock()

        with (
            patch("asyncio.to_thread", side_effect=RuntimeError("disk error")),
            patch(
                "app.services.notification_service.create_notification"
            ) as mock_create,
            patch("sqlmodel.Session", return_value=mock_sync_cm),
        ):
            await document_service.process_document(document_id, session_factory)

        mock_create.assert_called_once()
        _, call_kwargs = mock_create.call_args
        assert call_kwargs["user_id"] == user_id
        assert call_kwargs["type"] == NotificationType.TRANSLATION_FAILED
        assert str(document_id) in call_kwargs["action_url"]

    @pytest.mark.asyncio
    async def test_notification_failure_does_not_propagate(self) -> None:
        """If the failure notification itself raises, processing completes silently."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_session, session_factory = _make_process_document_mocks(
            document_id, user_id
        )
        mock_sync_cm = _make_sync_session_mock()

        with (
            patch("asyncio.to_thread", side_effect=RuntimeError("disk error")),
            patch(
                "app.services.notification_service.create_notification",
                side_effect=Exception("notification DB unavailable"),
            ),
            patch("sqlmodel.Session", return_value=mock_sync_cm),
        ):
            # Should not raise — notification errors are swallowed
            await document_service.process_document(document_id, session_factory)

    @pytest.mark.asyncio
    async def test_notification_failure_captures_to_sentry(self) -> None:
        """On notification failure sentry_sdk.capture_exception is called with context."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_session, session_factory = _make_process_document_mocks(
            document_id, user_id
        )
        mock_sync_cm = _make_sync_session_mock()

        with (
            patch("asyncio.to_thread", side_effect=RuntimeError("disk error")),
            patch(
                "app.services.notification_service.create_notification",
                side_effect=Exception("SMTP unavailable"),
            ),
            patch("sqlmodel.Session", return_value=mock_sync_cm),
            patch("app.services.document_service.sentry_sdk") as mock_sentry,
        ):
            await document_service.process_document(document_id, session_factory)

        mock_sentry.capture_exception.assert_called()

    @pytest.mark.asyncio
    async def test_notification_failure_sets_retry_fields(self) -> None:
        """On notification failure notification_failure_count and notification_retry_at
        are persisted on the document so the retry task can pick it up."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_session, session_factory = _make_process_document_mocks(
            document_id, user_id
        )
        mock_sync_cm = _make_sync_session_mock()

        with (
            patch("asyncio.to_thread", side_effect=RuntimeError("disk error")),
            patch(
                "app.services.notification_service.create_notification",
                side_effect=Exception("SMTP unavailable"),
            ),
            patch("sqlmodel.Session", return_value=mock_sync_cm),
            patch("app.services.document_service.sentry_sdk"),
        ):
            await document_service.process_document(document_id, session_factory)

        doc = mock_session.execute.return_value.scalar_one_or_none.return_value
        assert doc.notification_failure_count == 1
        assert doc.notification_retry_at is not None
        # committed at least twice: once for FAILED status, once for retry tracking
        assert mock_session.commit.await_count >= 2


# ── mark_stuck_documents_failed ───────────────────────────────────────────────


class TestMarkStuckDocumentsFailed:
    @pytest.mark.asyncio
    async def test_marks_old_processing_docs_as_failed(self) -> None:
        """Bulk UPDATE returns affected IDs; count and commit are correct."""
        affected_id = uuid.uuid4()

        mock_result = MagicMock()
        # Bulk UPDATE RETURNING yields the IDs of updated rows
        mock_result.scalars.return_value.all.return_value = [affected_id]
        mock_session = AsyncMock()
        mock_session.execute.return_value = mock_result

        count = await mark_stuck_documents_failed(mock_session, timeout_minutes=10)

        assert count == 1
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_ignores_recent_processing_docs(self) -> None:
        """When the bulk UPDATE matches no rows, count is 0 and no commit is issued."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_session = AsyncMock()
        mock_session.execute.return_value = mock_result

        count = await mark_stuck_documents_failed(mock_session, timeout_minutes=10)

        assert count == 0
        mock_session.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_where_clause_filters_by_status_and_updated_at(self) -> None:
        """The executed UPDATE statement must include status and updated_at filters."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_session = AsyncMock()
        mock_session.execute.return_value = mock_result

        await mark_stuck_documents_failed(mock_session, timeout_minutes=10)

        mock_session.execute.assert_called_once()
        stmt = mock_session.execute.call_args[0][0]
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": False}))
        assert "document.status" in compiled
        assert "document.updated_at" in compiled


# ── Translation confidence threshold tests ────────────────────────────────────


def _make_translation_mock(confidence: float) -> MagicMock:
    """Create a mock translation result with the given confidence score."""
    tr = MagicMock()
    tr.translation.translated_text = "translated text"
    tr.translation.confidence = confidence
    tr.legal_warnings = []
    return tr


def _make_batch_result_mock(confidences: list[float]) -> MagicMock:
    """Create a mock batch translation result with per-page confidence scores."""
    batch = MagicMock()
    batch.translations = [_make_translation_mock(c) for c in confidences]
    return batch


class TestTranslationConfidenceThreshold:
    """Tests for requires_manual_review and translation_confidence_score logic."""

    def _make_setup(
        self,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        batch_confidences: list[float],
    ) -> tuple[MagicMock, object, MagicMock, list[dict], AsyncMock]:
        """Return (mock_session, session_factory, mock_sync_cm, pages, mock_svc)."""
        mock_session, session_factory = _make_process_document_mocks(
            document_id, user_id
        )
        mock_sync_cm = _make_sync_session_mock()

        pages = [
            {
                "page_number": i + 1,
                "original_text": f"Text page {i + 1}",
                "translated_text": "",
            }
            for i in range(len(batch_confidences))
        ]

        mock_svc = AsyncMock()
        mock_svc.batch_translate = AsyncMock(
            return_value=_make_batch_result_mock(batch_confidences)
        )

        return mock_session, session_factory, mock_sync_cm, pages, mock_svc

    async def _run(
        self,
        document_id: uuid.UUID,
        session_factory: object,
        pages: list[dict],
        mock_svc: AsyncMock,
        mock_sync_cm: MagicMock,
    ) -> None:
        """Run process_document with all heavyweight dependencies stubbed out."""
        with (
            patch(
                "app.services.document_service._extract_pages_sync",
                return_value=pages,
            ),
            patch(
                "app.services.document_service.get_translation_service",
                return_value=mock_svc,
            ),
            patch(
                "app.services.document_service.analyze_clause_risks",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.services.document_service.analyze_kaufvertrag",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.document_service.analyze_document_type",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.document_service.link_glossary_terms",
                new=AsyncMock(return_value=[]),
            ),
            patch("sqlmodel.Session", return_value=mock_sync_cm),
            patch("app.services.notification_service.create_notification"),
        ):
            await document_service.process_document(document_id, session_factory)

    @pytest.mark.asyncio
    async def test_requires_manual_review_false_when_all_pages_high_confidence(
        self,
    ) -> None:
        """No flag when all pages are above the confidence threshold."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()
        confidences = [0.95, 0.95, 0.95]

        mock_session, session_factory, mock_sync_cm, pages, mock_svc = self._make_setup(
            document_id, user_id, confidences
        )
        await self._run(document_id, session_factory, pages, mock_svc, mock_sync_cm)

        added = mock_session.add.call_args[0][0]
        assert added.requires_manual_review is False

    @pytest.mark.asyncio
    async def test_requires_manual_review_true_when_majority_low_confidence(
        self,
    ) -> None:
        """Flag is set when more than 20% of pages are below the threshold."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()
        # 3/3 pages below 0.70 → 100% > 20% → requires_manual_review=True
        confidences = [0.50, 0.50, 0.50]

        mock_session, session_factory, mock_sync_cm, pages, mock_svc = self._make_setup(
            document_id, user_id, confidences
        )
        await self._run(document_id, session_factory, pages, mock_svc, mock_sync_cm)

        added = mock_session.add.call_args[0][0]
        assert added.requires_manual_review is True

    @pytest.mark.asyncio
    async def test_requires_manual_review_false_when_minority_low_confidence(
        self,
    ) -> None:
        """No flag when exactly 20% of pages are below the threshold (not >20%)."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()
        # 1/5 pages below 0.70 → 20% which is NOT >20% → requires_manual_review=False
        confidences = [0.50, 0.95, 0.95, 0.95, 0.95]

        mock_session, session_factory, mock_sync_cm, pages, mock_svc = self._make_setup(
            document_id, user_id, confidences
        )
        await self._run(document_id, session_factory, pages, mock_svc, mock_sync_cm)

        added = mock_session.add.call_args[0][0]
        assert added.requires_manual_review is False

    @pytest.mark.asyncio
    async def test_translation_confidence_score_is_average(self) -> None:
        """translation_confidence_score equals the mean of all page confidence values."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()
        confidences = [0.80, 0.90, 0.70]
        expected_avg = sum(confidences) / len(confidences)

        mock_session, session_factory, mock_sync_cm, pages, mock_svc = self._make_setup(
            document_id, user_id, confidences
        )
        await self._run(document_id, session_factory, pages, mock_svc, mock_sync_cm)

        added = mock_session.add.call_args[0][0]
        assert added.translation_confidence_score == pytest.approx(expected_avg)


# ── Translation coverage gate tests ──────────────────────────────────────────


class TestTranslationCoverageGate:
    """Tests for partial translation coverage gate (Task #211)."""

    def _make_setup_with_coverage(
        self,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        total_pages: int,
        returned_translations: int,
    ) -> tuple[MagicMock, object, MagicMock, list[dict], AsyncMock]:
        """Setup where Azure returns fewer translations than pages sent."""
        mock_session, session_factory = _make_process_document_mocks(
            document_id, user_id
        )
        mock_sync_cm = _make_sync_session_mock()

        pages = [
            {
                "page_number": i + 1,
                "original_text": f"Text page {i + 1}",
                "translated_text": "",
            }
            for i in range(total_pages)
        ]

        confidences = [0.95] * returned_translations
        batch_result = _make_batch_result_mock(confidences)

        mock_svc = AsyncMock()
        mock_svc.batch_translate = AsyncMock(return_value=batch_result)

        return mock_session, session_factory, mock_sync_cm, pages, mock_svc

    async def _run(
        self,
        document_id: uuid.UUID,
        session_factory: object,
        pages: list[dict],
        mock_svc: AsyncMock,
        mock_sync_cm: MagicMock,
    ) -> None:
        with (
            patch(
                "app.services.document_service._extract_pages_sync",
                return_value=pages,
            ),
            patch(
                "app.services.document_service.get_translation_service",
                return_value=mock_svc,
            ),
            patch(
                "app.services.document_service.analyze_clause_risks",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.services.document_service.analyze_kaufvertrag",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.document_service.analyze_document_type",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.document_service.link_glossary_terms",
                new=AsyncMock(return_value=[]),
            ),
            patch("sqlmodel.Session", return_value=mock_sync_cm),
            patch("app.services.notification_service.create_notification"),
        ):
            await document_service.process_document(document_id, session_factory)

    @pytest.mark.asyncio
    async def test_fails_document_when_page_coverage_below_threshold(self) -> None:
        """Document is marked FAILED when Azure returns < 95% of submitted pages."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()
        # 5 pages sent, only 4 returned → 80% coverage < 95% threshold
        mock_session, session_factory, mock_sync_cm, pages, mock_svc = (
            self._make_setup_with_coverage(document_id, user_id, 5, 4)
        )
        await self._run(document_id, session_factory, pages, mock_svc, mock_sync_cm)

        # DocumentTranslation must NOT be added to session
        assert mock_session.add.call_count == 0
        # Document must be re-fetched and marked FAILED
        doc = mock_session.execute.return_value.scalar_one_or_none.return_value
        assert doc.status == "failed"
        assert "coverage" in doc.error_message.lower()

    @pytest.mark.asyncio
    async def test_succeeds_when_page_coverage_meets_threshold(self) -> None:
        """Document is marked COMPLETED when coverage exactly meets 95% threshold."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()
        # 20 pages sent, 19 returned → 95% coverage == threshold
        mock_session, session_factory, mock_sync_cm, pages, mock_svc = (
            self._make_setup_with_coverage(document_id, user_id, 20, 19)
        )
        await self._run(document_id, session_factory, pages, mock_svc, mock_sync_cm)

        # DocumentTranslation was added
        assert mock_session.add.call_count == 1
        added = mock_session.add.call_args[0][0]
        assert added.partial_translation_coverage == pytest.approx(19 / 20)

    @pytest.mark.asyncio
    async def test_partial_translation_coverage_is_1_for_full_translation(
        self,
    ) -> None:
        """partial_translation_coverage equals 1.0 when all pages are returned."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()
        # 3 pages sent, 3 returned → coverage = 1.0
        mock_session, session_factory, mock_sync_cm, pages, mock_svc = (
            self._make_setup_with_coverage(document_id, user_id, 3, 3)
        )
        await self._run(document_id, session_factory, pages, mock_svc, mock_sync_cm)

        added = mock_session.add.call_args[0][0]
        assert added.partial_translation_coverage == pytest.approx(1.0)

    @pytest.mark.asyncio
    async def test_fails_document_when_clause_coverage_below_threshold(self) -> None:
        """Document is marked FAILED when Azure returns < 95% of submitted clauses."""
        document_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_session, session_factory = _make_process_document_mocks(
            document_id, user_id
        )
        mock_sync_cm = _make_sync_session_mock()

        # Pages translate successfully (full coverage)
        pages = [
            {
                "page_number": 1,
                "original_text": "Der Kaufpreis beträgt EUR 350.000",
                "translated_text": "",
            }
        ]
        full_page_batch = _make_batch_result_mock([0.95])
        # Clauses: 5 sent, only 4 returned → 80% < 95%
        partial_clause_batch = MagicMock()
        partial_clause_batch.translations = [
            _make_translation_mock(0.95) for _ in range(4)
        ]

        call_count = 0

        async def _side_effect(**_kwargs: object) -> MagicMock:
            nonlocal call_count
            call_count += 1
            return full_page_batch if call_count == 1 else partial_clause_batch

        mock_svc = AsyncMock()
        mock_svc.batch_translate = AsyncMock(side_effect=_side_effect)

        # Patch _detect_clauses to return 5 clauses so clause_texts has 5 entries
        five_clauses = [
            {
                "clause_type": "purchase_price",
                "original_text": f"Kaufpreis {i}",
                "translated_text": "",
                "page_number": 1,
                "risk_level": "high",
            }
            for i in range(5)
        ]

        with (
            patch(
                "app.services.document_service._extract_pages_sync",
                return_value=pages,
            ),
            patch(
                "app.services.document_service.get_translation_service",
                return_value=mock_svc,
            ),
            patch(
                "app.services.document_service._detect_clauses",
                return_value=five_clauses,
            ),
            patch(
                "app.services.document_service.analyze_clause_risks",
                new=AsyncMock(return_value=[]),
            ),
            patch(
                "app.services.document_service.analyze_kaufvertrag",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.document_service.analyze_document_type",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "app.services.document_service.link_glossary_terms",
                new=AsyncMock(return_value=[]),
            ),
            patch("sqlmodel.Session", return_value=mock_sync_cm),
            patch("app.services.notification_service.create_notification"),
        ):
            await document_service.process_document(document_id, session_factory)

        # DocumentTranslation must NOT be added
        assert mock_session.add.call_count == 0
        doc = mock_session.execute.return_value.scalar_one_or_none.return_value
        assert doc.status == "failed"
        assert "coverage" in doc.error_message.lower()
