"""Dashboard Service.

Aggregates data across journeys, documents, calculations, and bookmarks
to produce the dashboard overview for a user.
"""

import uuid
from datetime import datetime, timezone

from sqlmodel import Session, func, select

from app.models.calculator import HiddenCostCalculation
from app.models.document import Document
from app.models.financing import FinancingAssessment
from app.models.legal import Law, LawBookmark
from app.models.roi import ROICalculation
from app.schemas.dashboard import (
    ActivityItem,
    ActivityType,
    BookmarkedLawSummary,
    DashboardOverviewResponse,
    JourneyOverview,
    SavedCalculationSummary,
    SavedDocumentSummary,
)
from app.services.journey_service import get_journey_service


def get_dashboard_overview(
    session: Session,
    user_id: uuid.UUID,
) -> DashboardOverviewResponse:
    """Build the full dashboard overview for a user.

    Args:
        session: Database session.
        user_id: Authenticated user's UUID.

    Returns:
        DashboardOverviewResponse with aggregated data.
    """
    journey_overview = _get_journey_overview(session, user_id)
    recent_docs = _get_recent_documents(session, user_id, limit=3)
    recent_calcs = _get_recent_calculations(session, user_id, limit=2)
    bookmarks = _get_recent_bookmarks(session, user_id, limit=3)
    activity = _build_activity_timeline(session, user_id, limit=10)
    docs_this_month = _count_documents_this_month(session, user_id)
    total_calcs = _count_total_calculations(session, user_id)
    total_bookmarks = _count_total_bookmarks(session, user_id)

    return DashboardOverviewResponse(
        journey=journey_overview,
        has_journey=journey_overview is not None,
        recent_documents=recent_docs,
        recent_calculations=recent_calcs,
        bookmarked_laws=bookmarks,
        recent_activity=activity,
        documents_translated_this_month=docs_this_month,
        total_calculations=total_calcs,
        total_bookmarks=total_bookmarks,
    )


def _get_journey_overview(
    session: Session,
    user_id: uuid.UUID,
) -> JourneyOverview | None:
    """Get the most recent active journey with progress info."""
    service = get_journey_service()
    journeys = service.get_user_journeys(session, user_id, active_only=True)
    if not journeys:
        return None

    journey = journeys[0]  # Most recent active journey
    progress = service.get_progress(session, journey)
    next_step = service.get_next_step(session, journey)

    return JourneyOverview(
        id=journey.id,
        title=journey.title,
        current_phase=progress["current_phase"],
        current_step_number=progress["current_step_number"],
        progress_percentage=progress["progress_percentage"],
        completed_steps=progress["completed_steps"],
        total_steps=progress["total_steps"],
        estimated_days_remaining=progress["estimated_days_remaining"],
        started_at=journey.started_at,
        next_step_title=next_step.title if next_step else None,
        next_step_id=next_step.id if next_step else None,
        phases=progress["phases"],
    )


def _get_recent_documents(
    session: Session,
    user_id: uuid.UUID,
    limit: int = 3,
) -> list[SavedDocumentSummary]:
    """Get most recent documents for the user."""
    statement = (
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .limit(limit)
    )
    documents = list(session.exec(statement).all())
    return [
        SavedDocumentSummary(
            id=doc.id,
            original_filename=doc.original_filename,
            document_type=doc.document_type,
            status=doc.status,
            created_at=doc.created_at,
        )
        for doc in documents
    ]


def _get_recent_calculations(
    session: Session,
    user_id: uuid.UUID,
    limit: int = 2,
) -> list[SavedCalculationSummary]:
    """Get most recent calculations across all calculator types."""
    calcs: list[SavedCalculationSummary] = []

    # Hidden cost calculations
    hc_stmt = (
        select(HiddenCostCalculation)
        .where(HiddenCostCalculation.user_id == user_id)
        .order_by(HiddenCostCalculation.created_at.desc())
        .limit(limit)
    )
    for calc in session.exec(hc_stmt).all():
        calcs.append(
            SavedCalculationSummary(
                id=calc.id,
                name=calc.name,
                calculator_type="hidden_costs",
                headline_value=f"\u20ac{calc.total_cost_of_ownership:,.0f}",
                created_at=calc.created_at,
            )
        )

    # ROI calculations
    roi_stmt = (
        select(ROICalculation)
        .where(ROICalculation.user_id == user_id)
        .order_by(ROICalculation.created_at.desc())
        .limit(limit)
    )
    for calc in session.exec(roi_stmt).all():
        calcs.append(
            SavedCalculationSummary(
                id=calc.id,
                name=calc.name,
                calculator_type="roi",
                headline_value=f"{calc.cash_on_cash_return:.1f}% CoC",
                created_at=calc.created_at,
            )
        )

    # Financing assessments
    fin_stmt = (
        select(FinancingAssessment)
        .where(FinancingAssessment.user_id == user_id)
        .order_by(FinancingAssessment.created_at.desc())
        .limit(limit)
    )
    for calc in session.exec(fin_stmt).all():
        calcs.append(
            SavedCalculationSummary(
                id=calc.id,
                name=calc.name,
                calculator_type="financing",
                headline_value=calc.likelihood_label,
                created_at=calc.created_at,
            )
        )

    # Sort by created_at descending, take limit
    calcs.sort(key=lambda c: c.created_at, reverse=True)
    return calcs[:limit]


def _get_recent_bookmarks(
    session: Session,
    user_id: uuid.UUID,
    limit: int = 3,
) -> list[BookmarkedLawSummary]:
    """Get most recent law bookmarks with law details."""
    statement = (
        select(LawBookmark, Law)
        .join(Law, LawBookmark.law_id == Law.id)
        .where(LawBookmark.user_id == user_id)
        .order_by(LawBookmark.created_at.desc())
        .limit(limit)
    )
    results = session.exec(statement).all()
    return [
        BookmarkedLawSummary(
            id=bookmark.id,
            citation=law.citation,
            title_en=law.title_en,
            category=law.category,
            bookmarked_at=bookmark.created_at,
        )
        for bookmark, law in results
    ]


def _build_activity_timeline(
    session: Session,
    user_id: uuid.UUID,
    limit: int = 10,
) -> list[ActivityItem]:
    """Merge recent activity from all tables into a unified timeline."""
    from app.models.journey import Journey, JourneyStep, StepStatus

    items: list[ActivityItem] = []

    # Journey starts
    j_stmt = (
        select(Journey)
        .where(Journey.user_id == user_id, Journey.started_at.isnot(None))
        .order_by(Journey.started_at.desc())
        .limit(limit)
    )
    for j in session.exec(j_stmt).all():
        items.append(
            ActivityItem(
                activity_type=ActivityType.JOURNEY_STARTED,
                title="Started journey",
                description=j.title,
                entity_id=j.id,
                timestamp=j.started_at,
            )
        )

    # Completed steps
    cs_stmt = (
        select(JourneyStep, Journey)
        .join(Journey, JourneyStep.journey_id == Journey.id)
        .where(
            Journey.user_id == user_id,
            JourneyStep.status == StepStatus.COMPLETED,
            JourneyStep.completed_at.isnot(None),
        )
        .order_by(JourneyStep.completed_at.desc())
        .limit(limit)
    )
    for step, _journey in session.exec(cs_stmt).all():
        items.append(
            ActivityItem(
                activity_type=ActivityType.STEP_COMPLETED,
                title="Completed step",
                description=step.title,
                entity_id=step.id,
                timestamp=step.completed_at,
            )
        )

    # Document uploads
    doc_stmt = (
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .limit(limit)
    )
    for doc in session.exec(doc_stmt).all():
        items.append(
            ActivityItem(
                activity_type=ActivityType.DOCUMENT_UPLOADED,
                title="Uploaded document",
                description=doc.original_filename,
                entity_id=doc.id,
                timestamp=doc.created_at,
            )
        )

    # Hidden cost calculations
    hc_stmt = (
        select(HiddenCostCalculation)
        .where(HiddenCostCalculation.user_id == user_id)
        .order_by(HiddenCostCalculation.created_at.desc())
        .limit(limit)
    )
    for calc in session.exec(hc_stmt).all():
        items.append(
            ActivityItem(
                activity_type=ActivityType.CALCULATION_SAVED,
                title="Saved calculation",
                description=calc.name or "Hidden costs calculation",
                entity_id=calc.id,
                timestamp=calc.created_at,
            )
        )

    # ROI calculations
    roi_stmt = (
        select(ROICalculation)
        .where(ROICalculation.user_id == user_id)
        .order_by(ROICalculation.created_at.desc())
        .limit(limit)
    )
    for calc in session.exec(roi_stmt).all():
        items.append(
            ActivityItem(
                activity_type=ActivityType.ROI_CALCULATED,
                title="ROI analysis",
                description=calc.name or "ROI calculation",
                entity_id=calc.id,
                timestamp=calc.created_at,
            )
        )

    # Financing assessments
    fin_stmt = (
        select(FinancingAssessment)
        .where(FinancingAssessment.user_id == user_id)
        .order_by(FinancingAssessment.created_at.desc())
        .limit(limit)
    )
    for calc in session.exec(fin_stmt).all():
        items.append(
            ActivityItem(
                activity_type=ActivityType.FINANCING_ASSESSED,
                title="Financing assessment",
                description=calc.name or "Financing eligibility",
                entity_id=calc.id,
                timestamp=calc.created_at,
            )
        )

    # Law bookmarks
    bk_stmt = (
        select(LawBookmark, Law)
        .join(Law, LawBookmark.law_id == Law.id)
        .where(LawBookmark.user_id == user_id)
        .order_by(LawBookmark.created_at.desc())
        .limit(limit)
    )
    for bookmark, law in session.exec(bk_stmt).all():
        items.append(
            ActivityItem(
                activity_type=ActivityType.LAW_BOOKMARKED,
                title="Bookmarked law",
                description=f"{law.citation} — {law.title_en}",
                entity_id=bookmark.id,
                timestamp=bookmark.created_at,
            )
        )

    # Sort all items by timestamp descending and take the limit
    items.sort(key=lambda i: i.timestamp, reverse=True)
    return items[:limit]


def _count_documents_this_month(
    session: Session,
    user_id: uuid.UUID,
) -> int:
    """Count documents uploaded since the first of this month."""
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    statement = select(func.count()).where(
        Document.user_id == user_id,
        Document.created_at >= first_of_month,
    )
    return session.exec(statement).one()


def _count_total_calculations(
    session: Session,
    user_id: uuid.UUID,
) -> int:
    """Count total calculations across all calculator types."""
    hc_count = session.exec(
        select(func.count()).where(HiddenCostCalculation.user_id == user_id)
    ).one()
    roi_count = session.exec(
        select(func.count()).where(ROICalculation.user_id == user_id)
    ).one()
    fin_count = session.exec(
        select(func.count()).where(FinancingAssessment.user_id == user_id)
    ).one()
    return hc_count + roi_count + fin_count


def _count_total_bookmarks(
    session: Session,
    user_id: uuid.UUID,
) -> int:
    """Count total law bookmarks for the user."""
    statement = select(func.count()).where(LawBookmark.user_id == user_id)
    return session.exec(statement).one()
