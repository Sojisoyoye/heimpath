"""Tests for document upload API endpoints."""

import io
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.models.document import DocumentStatus, DocumentType
from app.services.rate_limit_service import RateLimitInfo

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


_UNLOCKED_RATE_LIMIT = RateLimitInfo(
    is_locked=False, attempts_remaining=9, lockout_expires_at=None
)

# Named patches — used by upload tests that are NOT testing rate limiting, to
# prevent shared Redis state from triggering limits mid-suite.
_patch_upload_burst = patch(
    "app.api.routes.documents.rate_limit_service.record_document_upload_burst",
    return_value=_UNLOCKED_RATE_LIMIT,
)
_patch_upload_hourly = patch(
    "app.api.routes.documents.rate_limit_service.record_document_upload_hourly",
    return_value=_UNLOCKED_RATE_LIMIT,
)


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
        with _patch_upload_burst, _patch_upload_hourly:
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
        mock_task = MagicMock()
        mock_task.id = "celery-task-id-abc"
        with (
            _patch_upload_burst,
            _patch_upload_hourly,
            patch(
                "app.api.routes.documents.document_service.save_upload",
                new_callable=AsyncMock,
                return_value=mock_doc,
            ),
            patch(
                "app.tasks.document_tasks.process_document_task.delay",
                return_value=mock_task,
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
        with (
            _patch_upload_burst,
            _patch_upload_hourly,
            patch(
                "app.api.routes.documents.document_service.save_upload",
                new_callable=AsyncMock,
                side_effect=ValueError("does not appear to be a valid PDF"),
            ),
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


class TestRetryDocumentProcessing:
    def _make_failed_document(self, processing_attempt: int = 0) -> MagicMock:
        doc = MagicMock()
        doc.id = uuid.uuid4()
        doc.status = DocumentStatus.FAILED.value
        doc.error_message = "Some error"
        doc.page_count = 1
        doc.processing_attempt = processing_attempt
        doc.celery_task_id = None
        return doc

    def test_retry_endpoint_requeues_failed_document(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        """Returns 202 and re-queues a FAILED document."""
        doc = self._make_failed_document(processing_attempt=0)
        mock_task = MagicMock()
        mock_task.id = "new-celery-task-id"

        with (
            patch(
                "app.api.routes.documents.document_service.get_document",
                new_callable=AsyncMock,
                return_value=doc,
            ),
            patch(
                "app.tasks.document_tasks.process_document_task.delay",
                return_value=mock_task,
            ),
        ):
            r = client.post(
                f"{BASE}/{doc.id}/retry",
                headers=normal_user_token_headers,
            )
        assert r.status_code == 202

    def test_retry_endpoint_409_when_not_failed(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        """Returns 409 when the document status is not FAILED."""
        doc = MagicMock()
        doc.id = uuid.uuid4()
        doc.status = DocumentStatus.PROCESSING.value

        with patch(
            "app.api.routes.documents.document_service.get_document",
            new_callable=AsyncMock,
            return_value=doc,
        ):
            r = client.post(
                f"{BASE}/{doc.id}/retry",
                headers=normal_user_token_headers,
            )
        assert r.status_code == 409
        assert "failed" in r.json()["detail"].lower()

    def test_retry_endpoint_429_when_max_retries_reached(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        """Returns 429 when processing_attempt >= 3."""
        doc = self._make_failed_document(processing_attempt=3)

        with patch(
            "app.api.routes.documents.document_service.get_document",
            new_callable=AsyncMock,
            return_value=doc,
        ):
            r = client.post(
                f"{BASE}/{doc.id}/retry",
                headers=normal_user_token_headers,
            )
        assert r.status_code == 429
        assert "retry" in r.json()["detail"].lower()


class TestDocumentUploadRateLimit:
    _LOCKED_INFO = RateLimitInfo(
        is_locked=True,
        attempts_remaining=0,
        lockout_expires_at=datetime.now(timezone.utc) + timedelta(seconds=60),
    )

    def test_upload_returns_429_on_burst_limit(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        """Returns 429 with Retry-After when the per-minute burst limit is hit."""
        with patch(
            "app.api.routes.documents.rate_limit_service.record_document_upload_burst",
            return_value=self._LOCKED_INFO,
        ):
            r = client.post(
                f"{BASE}/upload",
                headers=normal_user_token_headers,
                files={
                    "file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")
                },
            )
        assert r.status_code == 429
        assert "Retry-After" in r.headers
        assert int(r.headers["Retry-After"]) >= 1

    def test_upload_returns_429_on_hourly_limit(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        """Returns 429 with Retry-After when the hourly upload limit is hit."""
        _unlocked = RateLimitInfo(
            is_locked=False, attempts_remaining=2, lockout_expires_at=None
        )
        _locked_hourly = RateLimitInfo(
            is_locked=True,
            attempts_remaining=0,
            lockout_expires_at=datetime.now(timezone.utc) + timedelta(seconds=3600),
        )
        with (
            patch(
                "app.api.routes.documents.rate_limit_service.record_document_upload_burst",
                return_value=_unlocked,
            ),
            patch(
                "app.api.routes.documents.rate_limit_service.record_document_upload_hourly",
                return_value=_locked_hourly,
            ),
        ):
            r = client.post(
                f"{BASE}/upload",
                headers=normal_user_token_headers,
                files={
                    "file": ("test.pdf", io.BytesIO(_MINIMAL_PDF), "application/pdf")
                },
            )
        assert r.status_code == 429
        assert "Retry-After" in r.headers
        assert int(r.headers["Retry-After"]) >= 1
