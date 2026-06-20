"""Admin endpoints for scheduler job monitoring and manual triggering."""

import logging
from datetime import datetime, timedelta, timezone

import sentry_sdk
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import Session, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.core.database import AsyncSessionLocal
from app.core.db import engine
from app.models.feedback import Feedback
from app.models.journey import Journey
from app.models.user import User
from app.schemas.admin import GrowthMetricsResponse, TranslatorUsageResponse
from app.services.document_service import mark_stuck_documents_failed
from app.services.portfolio_service import generate_recurring_transactions
from app.services.quota_service import get_usage_stats
from app.services.scheduler_service import get_last_run, record_job_run

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# Known scheduler jobs with their expected run intervals in seconds.
# The health endpoint flags any job not seen within 2× its interval.
_JOB_INTERVALS: dict[str, int] = {
    "recurring_generation": 7 * 24 * 3600,  # weekly
    "stuck_document_cleanup": 5 * 60,  # every 5 minutes
}


@router.get(
    "/jobs/health",
    dependencies=[Depends(get_current_active_superuser)],
)
def scheduler_health() -> dict[str, dict]:
    """Return health status for all known scheduler jobs. Superuser-only.

    A job is flagged as stale when its last recorded run is older than
    2× its expected interval, or when it has never been recorded.
    """
    now = datetime.now(timezone.utc)
    result: dict[str, dict] = {}
    for job_name, interval_secs in _JOB_INTERVALS.items():
        last_run = get_last_run(job_name)
        threshold = timedelta(seconds=interval_secs * 2)
        if last_run is None:
            status = "never_run"
            stale = True
        elif now - last_run > threshold:
            status = "stale"
            stale = True
        else:
            status = "ok"
            stale = False
        result[job_name] = {
            "last_run": last_run.isoformat() if last_run else None,
            "status": status,
            "stale": stale,
        }
    return result


@router.post(
    "/jobs/{job_name}/trigger",
    dependencies=[Depends(get_current_active_superuser)],
    status_code=202,
)
async def trigger_job(job_name: str) -> dict[str, str]:
    """Manually trigger a scheduler job and return the result. Superuser-only.

    Use this to recover from a silent job failure without restarting the
    service.  The job runs synchronously in the request; the response
    includes the number of items processed.
    """
    if job_name not in _JOB_INTERVALS:
        raise HTTPException(status_code=404, detail=f"Unknown job: {job_name}")

    try:
        if job_name == "recurring_generation":
            with Session(engine) as session:
                count = generate_recurring_transactions(session)
            if count == 0:
                logger.warning(
                    "Manual trigger of recurring_generation produced 0 transactions"
                )
            else:
                logger.info(
                    "Manual trigger of recurring_generation produced %d transactions",
                    count,
                )
        else:  # stuck_document_cleanup
            async with AsyncSessionLocal() as session:
                count = await mark_stuck_documents_failed(session)
            logger.info(
                "Manual trigger of stuck_document_cleanup: marked %d as failed", count
            )

        record_job_run(job_name)
        return {"job": job_name, "status": "triggered", "count": str(count)}

    except Exception as exc:
        sentry_sdk.capture_exception(exc)
        logger.exception("Manual trigger of job '%s' failed", job_name)
        raise HTTPException(
            status_code=500, detail=f"Job '{job_name}' failed during manual trigger"
        ) from exc


@router.get(
    "/usage/translator",
    dependencies=[Depends(get_current_active_superuser)],
)
def translator_usage() -> TranslatorUsageResponse:
    """Return current-month Azure Translator character usage. Superuser-only."""
    return TranslatorUsageResponse(**get_usage_stats())


@router.get(
    "/growth-metrics",
    dependencies=[Depends(get_current_active_superuser)],
)
def growth_metrics(session: SessionDep) -> GrowthMetricsResponse:
    """Return real-time growth metrics for GrowthOS. Superuser-only."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    fortnight_ago = now - timedelta(days=14)

    total_users = session.exec(select(func.count(User.id))).one()

    signups_this_week = session.exec(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    ).one()

    # Activation = users who have started at least one journey
    users_with_journey = session.exec(
        select(func.count(func.distinct(Journey.user_id)))
    ).one()
    activation_rate = round(
        (users_with_journey / total_users * 100) if total_users else 0, 1
    )

    # Return visit proxy = users active (updated journey) in last 14 days / total users
    recently_active = session.exec(
        select(func.count(func.distinct(Journey.user_id))).where(
            Journey.updated_at >= fortnight_ago
        )
    ).one()
    return_visit_rate = round(
        (recently_active / total_users * 100) if total_users else 0, 1
    )

    total_feedback = session.exec(select(func.count(Feedback.id))).one()

    feedback_this_week = session.exec(
        select(func.count(Feedback.id)).where(Feedback.created_at >= week_ago)
    ).one()

    journeys_started = session.exec(select(func.count(Journey.id))).one()

    journeys_active = session.exec(
        select(func.count(Journey.id)).where(Journey.updated_at >= fortnight_ago)
    ).one()

    return GrowthMetricsResponse(
        signups=total_users,
        signups_this_week=signups_this_week,
        activation_rate=activation_rate,
        return_visit_rate=return_visit_rate,
        feedback_count=total_feedback,
        feedback_this_week=feedback_this_week,
        journeys_started=journeys_started,
        journeys_active=journeys_active,
        as_of=now.isoformat(),
    )
