"""Tests for scheduled Celery beat tasks (recurring generation + stuck-doc cleanup)."""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

from app.tasks.scheduled_tasks import (
    cleanup_stuck_documents_task,
    generate_recurring_transactions_task,
)

# ── helpers ───────────────────────────────────────────────────────────────────


def _sync_session_cm() -> MagicMock:
    """Minimal sync context-manager mock for sqlmodel Session."""
    cm = MagicMock()
    cm.__enter__ = MagicMock(return_value=cm)
    cm.__exit__ = MagicMock(return_value=False)
    return cm


# ── generate_recurring_transactions_task ──────────────────────────────────────


class TestGenerateRecurringTransactionsTask:
    def test_calls_generate_recurring_transactions(self) -> None:
        """Task delegates to generate_recurring_transactions and returns the count."""
        with (
            patch("app.tasks.scheduled_tasks.Session", return_value=_sync_session_cm()),
            patch(
                "app.tasks.scheduled_tasks.generate_recurring_transactions",
                return_value=5,
            ) as mock_gen,
            patch("app.tasks.scheduled_tasks.record_job_run"),
        ):
            result = generate_recurring_transactions_task.apply()

        mock_gen.assert_called_once()
        assert result.get() == 5

    def test_logs_warning_on_zero_transactions(self) -> None:
        """A warning is emitted when no transactions are generated."""
        with (
            patch("app.tasks.scheduled_tasks.Session", return_value=_sync_session_cm()),
            patch(
                "app.tasks.scheduled_tasks.generate_recurring_transactions",
                return_value=0,
            ),
            patch("app.tasks.scheduled_tasks.record_job_run"),
            patch("app.tasks.scheduled_tasks.logger") as mock_logger,
        ):
            generate_recurring_transactions_task.apply()

        mock_logger.warning.assert_called_once()

    def test_captures_exception_to_sentry_and_always_records_job(self) -> None:
        """Exceptions are captured to Sentry; record_job_run fires via finally."""
        with (
            patch("app.tasks.scheduled_tasks.Session", return_value=_sync_session_cm()),
            patch(
                "app.tasks.scheduled_tasks.generate_recurring_transactions",
                side_effect=RuntimeError("DB error"),
            ),
            patch("app.tasks.scheduled_tasks.record_job_run") as mock_record,
            patch("app.tasks.scheduled_tasks.sentry_sdk") as mock_sentry,
        ):
            generate_recurring_transactions_task.apply()

        mock_sentry.capture_exception.assert_called_once()
        mock_record.assert_called_once_with("recurring_generation")

    def test_records_job_run_on_success(self) -> None:
        """record_job_run('recurring_generation') is always called."""
        with (
            patch("app.tasks.scheduled_tasks.Session", return_value=_sync_session_cm()),
            patch(
                "app.tasks.scheduled_tasks.generate_recurring_transactions",
                return_value=3,
            ),
            patch("app.tasks.scheduled_tasks.record_job_run") as mock_record,
        ):
            generate_recurring_transactions_task.apply()

        mock_record.assert_called_once_with("recurring_generation")


# ── cleanup_stuck_documents_task ──────────────────────────────────────────────


class TestCleanupStuckDocumentsTask:
    def test_calls_mark_stuck_documents_failed(self) -> None:
        """Task calls mark_stuck_documents_failed and returns affected count."""
        mock_session = AsyncMock()

        @asynccontextmanager
        async def _factory():
            yield mock_session

        with (
            patch(
                "app.tasks.scheduled_tasks.AsyncSessionLocal",
                return_value=_factory(),
            ),
            patch(
                "app.tasks.scheduled_tasks.mark_stuck_documents_failed",
                new_callable=AsyncMock,
                return_value=2,
            ) as mock_cleanup,
            patch("app.tasks.scheduled_tasks.record_job_run"),
        ):
            result = cleanup_stuck_documents_task.apply()

        mock_cleanup.assert_awaited_once()
        assert result.get() == 2

    def test_records_job_run_even_on_exception(self) -> None:
        """record_job_run fires via finally even when the task raises."""

        @asynccontextmanager
        async def _failing_factory():
            raise RuntimeError("session error")
            yield  # unreachable — makes this a valid async generator

        with (
            patch(
                "app.tasks.scheduled_tasks.AsyncSessionLocal",
                return_value=_failing_factory(),
            ),
            patch("app.tasks.scheduled_tasks.record_job_run") as mock_record,
            patch("app.tasks.scheduled_tasks.sentry_sdk"),
        ):
            cleanup_stuck_documents_task.apply()

        mock_record.assert_called_once_with("stuck_document_cleanup")

    def test_captures_exception_to_sentry_and_always_records_job(self) -> None:
        """Exceptions are captured to Sentry; record_job_run fires via finally."""

        @asynccontextmanager
        async def _failing_factory():
            raise RuntimeError("session error")
            yield  # unreachable — makes this a valid async generator

        with (
            patch(
                "app.tasks.scheduled_tasks.AsyncSessionLocal",
                return_value=_failing_factory(),
            ),
            patch("app.tasks.scheduled_tasks.record_job_run") as mock_record,
            patch("app.tasks.scheduled_tasks.sentry_sdk") as mock_sentry,
        ):
            cleanup_stuck_documents_task.apply()

        mock_sentry.capture_exception.assert_called_once()
        mock_record.assert_called_once_with("stuck_document_cleanup")

    def test_records_job_run_on_success(self) -> None:
        """record_job_run('stuck_document_cleanup') is always called."""
        mock_session = AsyncMock()

        @asynccontextmanager
        async def _factory():
            yield mock_session

        with (
            patch(
                "app.tasks.scheduled_tasks.AsyncSessionLocal",
                return_value=_factory(),
            ),
            patch(
                "app.tasks.scheduled_tasks.mark_stuck_documents_failed",
                new_callable=AsyncMock,
                return_value=0,
            ),
            patch("app.tasks.scheduled_tasks.record_job_run") as mock_record,
        ):
            cleanup_stuck_documents_task.apply()

        mock_record.assert_called_once_with("stuck_document_cleanup")
