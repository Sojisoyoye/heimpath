"""Professional network directory service."""

import uuid

from sqlalchemy import func, select
from sqlmodel import Session

from app.models.professional import Professional, ProfessionalReview


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
        query = query.where(Professional.languages.ilike(f"%{language}%"))

    if min_rating is not None:
        query = query.where(Professional.average_rating >= min_rating)

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.execute(count_query).scalar() or 0

    # Pagination
    offset = (page - 1) * page_size
    query = (
        query.order_by(Professional.average_rating.desc())
        .offset(offset)
        .limit(page_size)
    )

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
    )
    session.add(review)
    session.flush()

    # Update denormalized rating fields
    _update_professional_rating(session, professional_id)

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


def get_available_cities(session: Session) -> list[str]:
    """Get distinct cities from professionals."""
    query = select(Professional.city).distinct().order_by(Professional.city)
    return list(session.execute(query).scalars().all())
