"""Celery tasks for document processing."""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone

import sentry_sdk
from sqlalchemy import select
from sqlmodel import Session as SyncSession

from app.core.database import AsyncSessionLocal
from app.core.db import engine as sync_engine
from app.models.document import Document, DocumentStatus
from app.models.notification import NotificationType
from app.services import document_service, notification_service
from app.services.document_service import _MAX_NOTIFICATION_RETRIES
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


async def _retry_failed_notifications_async() -> int:
    """Query documents with pending notification retries and attempt re-delivery.

    Called by :func:`retry_failed_notifications` every 10 minutes via Celery beat.

    Returns:
        Number of documents where a retry was attempted.
    """
    now = datetime.now(timezone.utc)
    attempted = 0

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Document)
            .where(Document.notification_failure_count > 0)
            .where(Document.notification_failure_count < _MAX_NOTIFICATION_RETRIES)
            .where(Document.notification_retry_at <= now)
        )
        documents = result.scalars().all()

        for document in documents:
            attempted += 1
            try:
                notif_type = (
                    NotificationType.DOCUMENT_TRANSLATED
                    if document.status == DocumentStatus.COMPLETED.value
                    else NotificationType.TRANSLATION_FAILED
                )
                title = (
                    "Document Translated"
                    if document.status == DocumentStatus.COMPLETED.value
                    else "Translation Failed"
                )
                message = (
                    f'Your document "{document.original_filename}" has been translated.'
                    if document.status == DocumentStatus.COMPLETED.value
                    else f'Translation of "{document.original_filename}" could not be completed.'
                )

                with SyncSession(sync_engine) as sync_session:
                    notification_service.create_notification(
                        sync_session,
                        user_id=document.user_id,
                        type=notif_type,
                        title=title,
                        message=message,
                        action_url=f"/documents/{document.id}",
                    )

                # Delivered — clear tracking fields
                document.notification_failure_count = 0
                document.notification_retry_at = None
                await session.commit()
                logger.info("Retry notification delivered for document %s", document.id)
            except Exception:
                document.notification_failure_count += 1
                if document.notification_failure_count >= _MAX_NOTIFICATION_RETRIES:
                    logger.error(
                        "Notification permanently failed for document %s after %d attempts",
                        document.id,
                        _MAX_NOTIFICATION_RETRIES,
                    )
                    sentry_sdk.capture_message(
                        f"Document notification permanently failed after {_MAX_NOTIFICATION_RETRIES} retries",
                        level="error",
                        extra={
                            "document_id": str(document.id),
                            "user_id": str(document.user_id),
                        },
                    )
                    document.notification_retry_at = None
                else:
                    logger.exception(
                        "Notification retry failed for document %s (attempt %d), rescheduling",
                        document.id,
                        document.notification_failure_count,
                    )
                    document.notification_retry_at = now + timedelta(minutes=5)
                await session.commit()

    return attempted


@celery_app.task(name="app.tasks.document_tasks.retry_failed_notifications")
def retry_failed_notifications() -> int:
    """Celery beat task: retry document notifications that previously failed.

    Scheduled every 10 minutes via :data:`app.worker.celery_app` beat schedule.
    """
    return asyncio.run(_retry_failed_notifications_async())
