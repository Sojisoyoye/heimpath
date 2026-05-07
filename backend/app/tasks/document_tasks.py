"""Celery tasks for document processing."""

import asyncio
import uuid

from app.core.database import AsyncSessionLocal
from app.services import document_service
from app.worker import celery_app


@celery_app.task(
    bind=True,
    name="app.tasks.document_tasks.process_document",
    max_retries=3,
    default_retry_delay=60,
)
def process_document_task(self, document_id_str: str) -> None:  # type: ignore[misc]
    """Run process_document() inside asyncio.run() (Celery workers are sync)."""
    try:
        asyncio.run(
            document_service.process_document(
                document_id=uuid.UUID(document_id_str),
                session_factory=AsyncSessionLocal,
            )
        )
    except Exception as exc:
        raise self.retry(exc=exc)
