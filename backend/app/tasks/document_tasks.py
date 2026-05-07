"""Celery tasks for document processing."""

import asyncio
import logging
import uuid

from app.core.database import AsyncSessionLocal
from app.services import document_service
from app.worker import celery_app

logger = logging.getLogger(__name__)

# Maximum automated retries by the Celery worker (separate from user-initiated retries
# controlled by MAX_USER_RETRIES in documents.py).
_CELERY_MAX_RETRIES = 3

# Non-transient errors that must NOT be retried — they indicate a caller or data bug.
_NON_RETRYABLE = (ValueError, TypeError)


@celery_app.task(
    bind=True,
    name="app.tasks.document_tasks.process_document",
    max_retries=_CELERY_MAX_RETRIES,
    default_retry_delay=60,
)
def process_document_task(self, document_id_str: str) -> None:  # type: ignore[misc]
    """Run process_document() inside asyncio.run() (Celery workers are sync).

    Note: asyncio.run() creates a new event loop per task. This is correct for
    the default prefork pool. Do NOT switch to the gevent or eventlet pool — both
    conflict with asyncio.run().
    """
    try:
        asyncio.run(
            document_service.process_document(
                document_id=uuid.UUID(document_id_str),
                session_factory=AsyncSessionLocal,
            )
        )
    except _NON_RETRYABLE as exc:
        # Non-transient errors (bad UUID, programming mistake) — do not retry.
        logger.error("Non-retryable error in process_document_task: %s", exc)
        raise
    except Exception as exc:
        raise self.retry(exc=exc)
