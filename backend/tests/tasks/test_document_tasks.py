"""Tests for document Celery tasks."""

import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from celery.exceptions import Retry

from app.models.document import Document, DocumentStatus, DocumentType
from app.tasks.document_tasks import (
    _retry_failed_notifications_async,
    process_document_task,
)


class TestProcessDocumentTask:
    def test_process_document_task_calls_process_document(self) -> None:
        """Task calls process_document with correct UUID and actually runs the coroutine."""
        document_id = uuid.uuid4()

        with patch(
            "app.tasks.document_tasks.document_service.process_document",
            new_callable=AsyncMock,
            return_value=None,
        ) as mock_process:
            # apply() runs the task synchronously, exercising asyncio.run() for real.
            process_document_task.apply(args=[str(document_id)])

        mock_process.assert_called_once()
        assert mock_process.call_args[1]["document_id"] == document_id

    def test_process_document_task_retries_on_exception(self) -> None:
        """Task triggers Celery retry when process_document raises a transient exception."""
        document_id_str = str(uuid.uuid4())

        with (
            patch(
                "app.tasks.document_tasks.document_service.process_document",
                new_callable=AsyncMock,
                side_effect=RuntimeError("translation API down"),
            ),
            pytest.raises(Retry),
        ):
            process_document_task.apply(args=[document_id_str], throw=True)

    def test_process_document_task_does_not_retry_on_value_error(self) -> None:
        """ValueError (e.g. bad UUID) must NOT trigger Celery retry."""
        with patch(
            "app.tasks.document_tasks.document_service.process_document",
            new_callable=AsyncMock,
            side_effect=ValueError("bad uuid format"),
        ):
            with pytest.raises(ValueError):
                process_document_task.apply(args=[str(uuid.uuid4())], throw=True)


# ── retry_failed_notifications ────────────────────────────────────────────────


def _make_doc(
    *,
    failure_count: int = 1,
    retry_at_offset_minutes: int = -1,
    status: str = DocumentStatus.COMPLETED.value,
) -> Document:
    """Build a Document instance with notification tracking fields set."""
    doc = Document(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        original_filename="test.pdf",
        stored_filename="abc.pdf",
        file_path="/tmp/abc.pdf",
        file_size_bytes=1024,
        page_count=1,
        document_type=DocumentType.UNKNOWN.value,
        status=status,
        notification_failure_count=failure_count,
        notification_retry_at=datetime.now(timezone.utc)
        + timedelta(minutes=retry_at_offset_minutes),
    )
    doc.created_at = datetime.now(timezone.utc)
    return doc


def _make_async_session_with_docs(docs: list) -> tuple:
    """Build a mock AsyncSessionLocal that yields docs from a SELECT."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = docs

    mock_session = AsyncMock()
    mock_session.execute.return_value = mock_result
    mock_session.commit = AsyncMock()

    @asynccontextmanager
    async def _factory():
        yield mock_session

    return mock_session, _factory


class TestRetryFailedNotifications:
    """Tests for the periodic retry task that re-sends failed notifications."""

    @pytest.mark.asyncio
    async def test_delivers_notification_and_resets_counters(self) -> None:
        """Successful retry resets notification_failure_count to 0."""
        doc = _make_doc(failure_count=1)
        mock_session, session_factory = _make_async_session_with_docs([doc])
        mock_sync_cm = MagicMock()
        mock_sync_cm.__enter__ = MagicMock(return_value=mock_sync_cm)
        mock_sync_cm.__exit__ = MagicMock(return_value=False)

        with (
            patch(
                "app.tasks.document_tasks.AsyncSessionLocal",
                return_value=session_factory(),
            ),
            patch("app.tasks.document_tasks.notification_service.create_notification"),
            patch("sqlmodel.Session", return_value=mock_sync_cm),
        ):
            await _retry_failed_notifications_async()

        assert doc.notification_failure_count == 0
        assert doc.notification_retry_at is None
        mock_session.commit.assert_awaited()

    @pytest.mark.asyncio
    async def test_skips_docs_not_yet_due(self) -> None:
        """Documents whose retry_at is in the future are not queried."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []  # query returns nothing

        mock_session = AsyncMock()
        mock_session.execute.return_value = mock_result

        @asynccontextmanager
        async def _factory():
            yield mock_session

        with (
            patch(
                "app.tasks.document_tasks.AsyncSessionLocal", return_value=_factory()
            ),
            patch(
                "app.tasks.document_tasks.notification_service.create_notification"
            ) as mock_notify,
        ):
            await _retry_failed_notifications_async()

        mock_notify.assert_not_called()

        # Verify the executed query filters on both notification tracking columns
        mock_session.execute.assert_called_once()
        stmt = mock_session.execute.call_args[0][0]
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": False}))
        assert "notification_failure_count" in compiled
        assert "notification_retry_at" in compiled

    @pytest.mark.asyncio
    async def test_increments_failure_count_and_reschedules_on_failure(self) -> None:
        """When retry still fails the count increments and retry_at is pushed forward."""
        doc = _make_doc(failure_count=1)
        mock_session, session_factory = _make_async_session_with_docs([doc])
        mock_sync_cm = MagicMock()
        mock_sync_cm.__enter__ = MagicMock(return_value=mock_sync_cm)
        mock_sync_cm.__exit__ = MagicMock(return_value=False)

        with (
            patch(
                "app.tasks.document_tasks.AsyncSessionLocal",
                return_value=session_factory(),
            ),
            patch(
                "app.tasks.document_tasks.notification_service.create_notification",
                side_effect=Exception("SMTP down"),
            ),
            patch("sqlmodel.Session", return_value=mock_sync_cm),
        ):
            await _retry_failed_notifications_async()

        assert doc.notification_failure_count == 2
        assert doc.notification_retry_at is not None
        mock_session.commit.assert_awaited()

    @pytest.mark.asyncio
    async def test_stops_retrying_and_reports_to_sentry_at_max_failures(self) -> None:
        """At max retries (3) the retry_at is cleared and Sentry is notified."""
        doc = _make_doc(failure_count=2)  # one more failure → 3 → max
        mock_session, session_factory = _make_async_session_with_docs([doc])
        mock_sync_cm = MagicMock()
        mock_sync_cm.__enter__ = MagicMock(return_value=mock_sync_cm)
        mock_sync_cm.__exit__ = MagicMock(return_value=False)

        with (
            patch(
                "app.tasks.document_tasks.AsyncSessionLocal",
                return_value=session_factory(),
            ),
            patch(
                "app.tasks.document_tasks.notification_service.create_notification",
                side_effect=Exception("SMTP down"),
            ),
            patch("sqlmodel.Session", return_value=mock_sync_cm),
            patch("app.tasks.document_tasks.sentry_sdk") as mock_sentry,
        ):
            await _retry_failed_notifications_async()

        assert doc.notification_failure_count == 3
        assert doc.notification_retry_at is None  # no further retries scheduled
        mock_sentry.capture_message.assert_called_once()
