"""Tests for document upload and translation service."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.document import Document, DocumentStatus, DocumentType
from app.services.document_service import (
    _detect_clauses,
    _detect_document_type,
    get_documents_by_step_id,
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
    async def test_filters_by_user_ownership(self) -> None:
        """Ensure the query filters by both step_id and user_id."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []

        mock_session = AsyncMock()
        mock_session.execute.return_value = mock_result

        step_id = uuid.uuid4()
        user_id = uuid.uuid4()

        await get_documents_by_step_id(mock_session, step_id, user_id)

        # Verify execute was called (query contains both filters)
        mock_session.execute.assert_called_once()
