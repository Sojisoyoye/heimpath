"""Tests for document upload API endpoints."""

import io
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.models.document import DocumentStatus, DocumentType

BASE = f"{settings.API_V1_STR}/documents"

_MINIMAL_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>>\nendobj\n"
    b"xref\n0 4\n0000000000 65535 f\n"
    b"0000000009 00000 n\n0000000068 00000 n\n0000000125 00000 n\n"
    b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n197\n%%EOF"
)


def _mock_document() -> MagicMock:
    """Return a minimal mock Document for upload response."""
    doc = MagicMock()
    doc.id = uuid.uuid4()
    doc.original_filename = "test.pdf"
    doc.file_size_bytes = len(_MINIMAL_PDF)
    doc.page_count = 1
    doc.document_type = DocumentType.UNKNOWN.value
    doc.status = DocumentStatus.UPLOADED.value
    doc.journey_step_id = None
    return doc


class TestDocumentUpload:
    def test_upload_unauthenticated_returns_401(self, client: TestClient) -> None:
        r = client.post(
            f"{BASE}/upload",
            files={"file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")},
        )
        assert r.status_code == 401

    def test_upload_non_pdf_returns_400(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        with patch(
            "app.api.routes.documents.document_service.save_upload",
            new_callable=AsyncMock,
        ) as mock_save:
            mock_save.return_value = _mock_document()
            r = client.post(
                f"{BASE}/upload",
                headers=normal_user_token_headers,
                files={
                    "file": (
                        "evil.html",
                        io.BytesIO(b"<html>not a pdf</html>"),
                        "text/html",
                    )
                },
            )
        assert r.status_code == 400
        assert "PDF" in r.json()["detail"]

    def test_upload_valid_pdf_returns_201(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        mock_doc = _mock_document()
        with (
            patch(
                "app.api.routes.documents.document_service.save_upload",
                new_callable=AsyncMock,
                return_value=mock_doc,
            ),
            patch(
                "app.api.routes.documents.document_service.process_document",
                new_callable=AsyncMock,
            ),
        ):
            r = client.post(
                f"{BASE}/upload",
                headers=normal_user_token_headers,
                files={
                    "file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")
                },
            )
        assert r.status_code == 201
        data = r.json()
        assert data["original_filename"] == mock_doc.original_filename
        assert data["status"] == DocumentStatus.UPLOADED.value

    def test_upload_invalid_pdf_bytes_returns_400(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        """save_upload raises ValueError for bad PDF bytes → 400."""
        with patch(
            "app.api.routes.documents.document_service.save_upload",
            new_callable=AsyncMock,
            side_effect=ValueError("does not appear to be a valid PDF"),
        ):
            r = client.post(
                f"{BASE}/upload",
                headers=normal_user_token_headers,
                files={
                    "file": (
                        "fake.pdf",
                        io.BytesIO(b"not-really-a-pdf"),
                        "application/pdf",
                    )
                },
            )
        assert r.status_code == 400
        assert "valid PDF" in r.json()["detail"]
