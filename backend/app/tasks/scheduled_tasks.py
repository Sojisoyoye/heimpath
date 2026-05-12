"""Celery beat tasks for scheduled background jobs.

Replaces the APScheduler jobs that previously ran inside the FastAPI web worker
process. Running these as Celery beat tasks prevents scheduler failures from
destabilising web workers and eliminates duplicate execution in multi-worker
deployments.
"""

import asyncio
import logging

import sentry_sdk
from sqlmodel import Session

from app.core.database import AsyncSessionLocal
from app.core.db import engine
from app.services.document_service import mark_stuck_documents_failed
from app.services.portfolio_service import generate_recurring_transactions
from app.services.scheduler_service import record_job_run
from app.worker import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.scheduled_tasks.generate_recurring_transactions")
def generate_recurring_transactions_task() -> int:
    """Generate recurring portfolio transactions for all users.

    Scheduled every Monday at 02:00 UTC via Celery beat.
    Captures exceptions to Sentry; always records a job-run heartbeat.

    Returns:
        Number of new transaction entries created (0 on failure).
    """
    try:
        with Session(engine) as session:
            count = generate_recurring_transactions(session)
        if count == 0:
            logger.warning(
                "recurring_generation produced 0 transactions — "
                "verify that recurring portfolio entries exist"
            )
        else:
            logger.info("Recurring transactions generated: %d", count)
        return count
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
        logger.exception("Recurring transaction generation failed")
        return 0
    finally:
        record_job_run("recurring_generation")


async def _cleanup_stuck_documents_async() -> int:
    """Async core of cleanup_stuck_documents_task."""
    async with AsyncSessionLocal() as session:
        return await mark_stuck_documents_failed(session)


@celery_app.task(name="app.tasks.scheduled_tasks.cleanup_stuck_documents")
def cleanup_stuck_documents_task() -> int:
    """Mark PROCESSING documents stuck longer than the timeout as FAILED.

    Scheduled every 5 minutes via Celery beat. Recovers documents whose
    worker crashed or timed out without updating their status.
    Always records a job-run heartbeat.

    Returns:
        Number of documents marked as failed (0 on error or nothing to do).
    """
    try:
        count = asyncio.run(_cleanup_stuck_documents_async())
        if count:
            logger.info("Stuck document cleanup: marked %d as failed", count)
        return count
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
        logger.exception("Stuck document cleanup failed")
        return 0
    finally:
        record_job_run("stuck_document_cleanup")
