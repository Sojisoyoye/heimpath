"""Tests for document Celery tasks."""

import uuid
from unittest.mock import patch

import pytest


class TestProcessDocumentTask:
    def test_process_document_task_calls_process_document(self) -> None:
        """Task calls asyncio.run with process_document for the correct UUID."""
        document_id = uuid.uuid4()

        with (
            patch("app.tasks.document_tasks.asyncio.run") as mock_run,
            patch(
                "app.tasks.document_tasks.document_service.process_document",
                return_value=None,
            ) as mock_process,
        ):
            from app.tasks.document_tasks import process_document_task

            process_document_task.apply(args=[str(document_id)])

        mock_run.assert_called_once()
        mock_process.assert_called_once()
        assert mock_process.call_args[1]["document_id"] == document_id

    def test_process_document_task_retries_on_exception(self) -> None:
        """Task triggers Celery retry when process_document raises an exception."""
        from celery.exceptions import Retry

        document_id_str = str(uuid.uuid4())

        with (
            patch(
                "app.tasks.document_tasks.asyncio.run",
                side_effect=RuntimeError("translation API down"),
            ),
            pytest.raises(Retry),
        ):
            from app.tasks.document_tasks import process_document_task

            # apply(throw=True) re-raises task exceptions including Retry
            process_document_task.apply(args=[document_id_str], throw=True)
