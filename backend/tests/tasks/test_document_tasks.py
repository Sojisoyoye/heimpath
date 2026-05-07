"""Tests for document Celery tasks."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest


class TestProcessDocumentTask:
    def test_process_document_task_calls_process_document(self) -> None:
        """Task calls process_document with correct UUID and actually runs the coroutine."""
        document_id = uuid.uuid4()

        with patch(
            "app.tasks.document_tasks.document_service.process_document",
            new_callable=AsyncMock,
            return_value=None,
        ) as mock_process:
            from app.tasks.document_tasks import process_document_task

            # apply() runs the task synchronously, exercising asyncio.run() for real.
            process_document_task.apply(args=[str(document_id)])

        mock_process.assert_called_once()
        assert mock_process.call_args[1]["document_id"] == document_id

    def test_process_document_task_retries_on_exception(self) -> None:
        """Task triggers Celery retry when process_document raises a transient exception."""
        from celery.exceptions import Retry

        document_id_str = str(uuid.uuid4())

        with (
            patch(
                "app.tasks.document_tasks.document_service.process_document",
                new_callable=AsyncMock,
                side_effect=RuntimeError("translation API down"),
            ),
            pytest.raises(Retry),
        ):
            from app.tasks.document_tasks import process_document_task

            process_document_task.apply(args=[document_id_str], throw=True)

    def test_process_document_task_does_not_retry_on_value_error(self) -> None:
        """ValueError (e.g. bad UUID) must NOT trigger Celery retry."""

        with (
            patch(
                "app.tasks.document_tasks.document_service.process_document",
                new_callable=AsyncMock,
                side_effect=ValueError("bad uuid format"),
            ),
        ):
            from app.tasks.document_tasks import process_document_task

            with pytest.raises(ValueError):
                process_document_task.apply(args=[str(uuid.uuid4())], throw=True)
