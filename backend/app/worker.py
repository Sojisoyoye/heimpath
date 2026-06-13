"""Celery application singleton for HeimPath background tasks."""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "heimpath",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.document_tasks", "app.tasks.scheduled_tasks"],
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=86400,  # 24 hours
    task_acks_late=True,  # ack only after completion (survive worker crash)
    task_reject_on_worker_lost=True,  # re-queue if worker dies mid-task
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "retry-failed-notifications": {
            "task": "app.tasks.document_tasks.retry_failed_notifications",
            "schedule": crontab(minute=0),  # hourly
        },
        "generate-recurring-transactions": {
            "task": "app.tasks.scheduled_tasks.generate_recurring_transactions",
            "schedule": crontab(day_of_week=1, hour=2, minute=0),  # Monday 02:00 UTC
        },
        "cleanup-stuck-documents": {
            "task": "app.tasks.scheduled_tasks.cleanup_stuck_documents",
            "schedule": crontab(minute="*/30"),  # every 30 minutes
        },
    },
)
