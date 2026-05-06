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
