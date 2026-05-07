"""Celery application singleton for HeimPath background tasks."""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "heimpath",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.document_tasks"],
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
)
