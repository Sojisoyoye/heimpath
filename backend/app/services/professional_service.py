"""Professional network directory service."""

import uuid

from sqlalchemy import func, select
from sqlmodel import Session

from app.models.professional import Professional, ProfessionalReview, ServiceType


class ProfessionalNotFoundError(Exception):
    """Raised when a professional is not found."""

    pass


class DuplicateReviewError(Exception):
    """Raised when a user tries to review the same professional twice."""

    pass


def get_professionals(
    session: Session,
    professional_type: str | None = None,
    city: str | None = None,
    language: str | None = None,
    min_rating: float | None = None,
    sort_by: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Professional], int]:
    """Get paginated list of professionals with optional filters."""
    query = select(Professional)

    if professional_type:
        query = query.where(Professional.type == professional_type)

    if city:
        query = query.where(Professional.city == city)

    if language:
        # Escape SQL LIKE wildcards in user input to prevent pattern abuse
        safe_language = language.replace("%", r"\%").replace("_", r"\_")
        query = query.where(
            Professional.languages.ilike(f"%{safe_language}%", escape="\\")
        )

    if min_rating is not None:
        query = query.where(Professional.average_rating >= min_rating)

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.execute(count_query).scalar() or 0

    # Sort order
    if sort_by == "reviews":
        order = Professional.review_count.desc()
    elif sort_by == "recommended":
        order = Professional.recommendation_rate.desc().nulls_last()
    else:
        order = Professional.average_rating.desc()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(order).offset(offset).limit(page_size)

    professionals = list(session.execute(query).scalars().all())
    return professionals, total


def get_professional_by_id(
    session: Session, professional_id: uuid.UUID
) -> Professional:
    """Get a professional by ID."""
    query = select(Professional).where(Professional.id == professional_id)
    professional = session.execute(query).scalars().first()
    if not professional:
        raise ProfessionalNotFoundError(f"Professional {professional_id} not found")
    return professional


def get_reviews_for_professional(
    session: Session, professional_id: uuid.UUID
) -> list[ProfessionalReview]:
    """Get all reviews for a professional."""
    query = (
        select(ProfessionalReview)
        .where(ProfessionalReview.professional_id == professional_id)
        .order_by(ProfessionalReview.created_at.desc())
    )
    return list(session.execute(query).scalars().all())


def submit_review(
    session: Session,
    professional_id: uuid.UUID,
    user_id: uuid.UUID,
    rating: int,
    comment: str | None = None,
    service_used: ServiceType | None = None,
    language_used: str | None = None,
    would_recommend: bool | None = None,
    response_time_rating: int | None = None,
) -> ProfessionalReview:
    """Submit a review for a professional. One review per user per professional."""
    # Verify professional exists
    get_professional_by_id(session, professional_id)

    # Check for existing review
    existing = (
        session.execute(
            select(ProfessionalReview).where(
                ProfessionalReview.professional_id == professional_id,
                ProfessionalReview.user_id == user_id,
            )
        )
        .scalars()
        .first()
    )

    if existing:
        raise DuplicateReviewError("You have already reviewed this professional")

    review = ProfessionalReview(
        professional_id=professional_id,
        user_id=user_id,
        rating=rating,
        comment=comment,
        service_used=service_used,
        language_used=language_used,
        would_recommend=would_recommend,
        response_time_rating=response_time_rating,
    )
    session.add(review)
    session.flush()

    # Update denormalized rating fields and trust signals
    _update_professional_rating(session, professional_id)
    _update_trust_signals(session, professional_id)

    session.commit()
    session.refresh(review)
    return review


def _update_professional_rating(session: Session, professional_id: uuid.UUID) -> None:
    """Recalculate average rating and review count for a professional."""
    result = session.execute(
        select(
            func.avg(ProfessionalReview.rating),
            func.count(ProfessionalReview.id),
        ).where(ProfessionalReview.professional_id == professional_id)
    ).one()

    avg_rating = float(result[0]) if result[0] else 0.0
    count = result[1] or 0

    professional = get_professional_by_id(session, professional_id)
    professional.average_rating = round(avg_rating, 2)
    professional.review_count = count
    session.add(professional)


def _update_trust_signals(session: Session, professional_id: uuid.UUID) -> None:
    """Recompute recommendation rate and review highlights for a professional."""
    # Recommendation rate
    recommend_total = (
        session.execute(
            select(func.count(ProfessionalReview.id)).where(
                ProfessionalReview.professional_id == professional_id,
                ProfessionalReview.would_recommend.is_not(None),
            )
        ).scalar()
        or 0
    )
    recommend_yes = (
        session.execute(
            select(func.count(ProfessionalReview.id)).where(
                ProfessionalReview.professional_id == professional_id,
                ProfessionalReview.would_recommend.is_(True),
            )
        ).scalar()
        or 0
    )
    recommendation_rate = (
        round(recommend_yes / recommend_total * 100, 1) if recommend_total > 0 else None
    )

    # Review highlights
    avg_response_time = session.execute(
        select(func.avg(ProfessionalReview.response_time_rating)).where(
            ProfessionalReview.professional_id == professional_id,
            ProfessionalReview.response_time_rating.is_not(None),
        )
    ).scalar()

    top_services_rows = (
        session.execute(
            select(
                ProfessionalReview.service_used,
                func.count(ProfessionalReview.id).label("cnt"),
            )
            .where(
                ProfessionalReview.professional_id == professional_id,
                ProfessionalReview.service_used.is_not(None),
            )
            .group_by(ProfessionalReview.service_used)
            .order_by(func.count(ProfessionalReview.id).desc())
            .limit(3)
        )
        .tuples()
        .all()
    )
    top_services = [row[0] for row in top_services_rows]

    review_highlights: dict | None = None
    if top_services or avg_response_time is not None:
        review_highlights = {
            "top_services": top_services,
            "avg_response_time": round(float(avg_response_time), 1)
            if avg_response_time is not None
            else None,
        }

    professional = get_professional_by_id(session, professional_id)
    professional.recommendation_rate = recommendation_rate
    professional.review_highlights = review_highlights
    session.add(professional)


def get_available_cities(session: Session) -> list[str]:
    """Get distinct cities that have professionals."""
    query = select(Professional.city).distinct().order_by(Professional.city)
    return list(session.execute(query).scalars().all())


def get_available_languages(session: Session) -> list[str]:
    """Get distinct languages spoken by professionals."""
    rows = session.execute(select(Professional.languages)).scalars().all()
    languages: set[str] = set()
    for lang_str in rows:
        for lang in lang_str.split(","):
            stripped = lang.strip()
            if stripped:
                languages.add(stripped)
    return sorted(languages)
