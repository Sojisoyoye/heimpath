"""Processed Stripe webhook event model for idempotency deduplication."""

import uuid

from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class ProcessedWebhookEvent(Base):
    """Records Stripe webhook event IDs that have been successfully processed.

    Provides idempotency protection against Stripe's automatic retry behaviour.
    Stripe retries webhooks that do not receive a timely 2xx response, so the
    same event can arrive multiple times. This table ensures each event is
    applied exactly once.

    The stripe_event_id unique constraint is the guard: a second delivery of
    the same event_id will hit an IntegrityError on commit, which the handler
    catches and converts to a 200 response (Stripe requires 2xx to stop retries).

    Records older than 30 days can be pruned safely — Stripe's maximum retry
    window is 3 days, so any surviving record is long past the retry risk.
    """

    __tablename__ = "processed_webhook_event"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )
    stripe_event_id = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    event_type = Column(String(100), nullable=True)
    processed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
