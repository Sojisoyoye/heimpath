"""Seed review data for professional directory.

Populates professional_review table with sample reviews across seeded
professionals. Idempotent: skips if reviews already exist.
"""

import logging
import uuid

from sqlmodel import Session, select

from app.models.professional import Professional, ProfessionalReview
from app.models.user import User

logger = logging.getLogger(__name__)

# Each entry maps a professional name to a list of review dicts.
# user_id is generated at insert time (no real users needed for seeds).
REVIEWS_BY_PROFESSIONAL: dict[str, list[dict]] = {
    "Dr. Anna Fischer": [
        {
            "rating": 5,
            "comment": "Anna made the entire property purchase stress-free. Her English is flawless and she explained every legal detail.",
            "service_used": "buying",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 5,
        },
        {
            "rating": 4,
            "comment": "Very thorough with contracts. Took a bit longer than expected but the quality was excellent.",
            "service_used": "legal",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 3,
        },
        {
            "rating": 5,
            "comment": "Helped us navigate the Grundbuch process. Highly recommended for expats.",
            "service_used": "buying",
            "language_used": "German",
            "would_recommend": True,
            "response_time_rating": 4,
        },
    ],
    "Mehmet Y\u0131lmaz": [
        {
            "rating": 5,
            "comment": "Mehmet understood the cross-border complexities perfectly. Great experience.",
            "service_used": "buying",
            "language_used": "Turkish",
            "would_recommend": True,
            "response_time_rating": 5,
        },
        {
            "rating": 4,
            "comment": "Good legal advice on investment structures. Would use again.",
            "service_used": "legal",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 4,
        },
    ],
    "Dr. Klaus Weber": [
        {
            "rating": 5,
            "comment": "Professional notary service. Explained the Kaufvertrag in English patiently.",
            "service_used": "buying",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 5,
        },
        {
            "rating": 3,
            "comment": "Service was adequate but the office was hard to reach by phone.",
            "service_used": "buying",
            "language_used": "German",
            "would_recommend": False,
            "response_time_rating": 2,
        },
        {
            "rating": 4,
            "comment": "Handled our land registry proceedings quickly.",
            "service_used": "buying",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 4,
        },
    ],
    "Li Wei Chen": [
        {
            "rating": 5,
            "comment": "Saved us thousands in property transfer tax through legitimate deductions. Brilliant advisor.",
            "service_used": "tax",
            "language_used": "Mandarin",
            "would_recommend": True,
            "response_time_rating": 5,
        },
        {
            "rating": 5,
            "comment": "Excellent understanding of international tax treaties. Helped with our rental income declaration.",
            "service_used": "rental",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 4,
        },
        {
            "rating": 4,
            "comment": "Very knowledgeable about Grunderwerbsteuer. Good communication.",
            "service_used": "tax",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 4,
        },
    ],
    "James Cooper": [
        {
            "rating": 5,
            "comment": "James secured us a fantastic mortgage rate. Being a fellow expat, he understood our situation perfectly.",
            "service_used": "buying",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 5,
        },
        {
            "rating": 4,
            "comment": "Good mortgage broker. The process took 6 weeks but the rate was competitive.",
            "service_used": "buying",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 3,
        },
        {
            "rating": 3,
            "comment": "Decent service but communication could be more proactive.",
            "service_used": "buying",
            "language_used": "English",
            "would_recommend": False,
            "response_time_rating": 2,
        },
    ],
    "Marco Rossi": [
        {
            "rating": 5,
            "comment": "Marco found us the perfect apartment in Schwabing. His local knowledge is unmatched.",
            "service_used": "buying",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 5,
        },
        {
            "rating": 4,
            "comment": "Great agent for the Munich market. Speaks Italian which was a huge plus for us.",
            "service_used": "buying",
            "language_used": "Italian",
            "would_recommend": True,
            "response_time_rating": 4,
        },
    ],
    "Priya Sharma": [
        {
            "rating": 5,
            "comment": "Priya found us an investment property in Kreuzberg with amazing potential. Very responsive.",
            "service_used": "buying",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 5,
        },
        {
            "rating": 4,
            "comment": "Knowledgeable about Berlin neighborhoods. Helped us find a rental property too.",
            "service_used": "rental",
            "language_used": "Hindi",
            "would_recommend": True,
            "response_time_rating": 4,
        },
        {
            "rating": 5,
            "comment": "Exceptional service. She went above and beyond during the entire buying process.",
            "service_used": "buying",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 5,
        },
    ],
    "Fatima Al-Rashid": [
        {
            "rating": 4,
            "comment": "Good tax advice for property buyers. Explained depreciation benefits clearly.",
            "service_used": "tax",
            "language_used": "Arabic",
            "would_recommend": True,
            "response_time_rating": 4,
        },
        {
            "rating": 5,
            "comment": "Fatima helped us understand all the tax obligations as foreign property owners.",
            "service_used": "tax",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 5,
        },
    ],
    "Maria Gonzalez-Schmidt": [
        {
            "rating": 5,
            "comment": "Maria handled our property purchase notarization perfectly. Speaks Spanish which was very helpful.",
            "service_used": "buying",
            "language_used": "Spanish",
            "would_recommend": True,
            "response_time_rating": 5,
        },
        {
            "rating": 4,
            "comment": "Professional and thorough. The process was smooth from start to finish.",
            "service_used": "buying",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 4,
        },
    ],
}


def _get_or_create_seed_users(session: Session, count: int) -> list[uuid.UUID]:
    """Create dummy seed users for review authorship. Returns user IDs."""
    user_ids: list[uuid.UUID] = []
    for i in range(count):
        email = f"seed-reviewer-{i}@heimpath.example"
        existing = (
            session.execute(select(User).where(User.email == email)).scalars().first()
        )
        if existing:
            user_ids.append(existing.id)
        else:
            placeholder = f"seed-no-login-{i}"  # noqa: S105
            user = User(
                email=email,
                hashed_password=placeholder,
                full_name=f"Seed Reviewer {i + 1}",
                is_active=False,
            )
            session.add(user)
            session.flush()
            user_ids.append(user.id)
    return user_ids


def seed_reviews(session: Session) -> None:
    """Seed sample reviews into the database.

    Idempotent per professional: if a professional already has reviews they are
    left untouched, but professionals with no reviews will have theirs added.
    This allows the seed data to grow over time without losing existing reviews.
    """
    # Build name -> professional lookup
    professionals = list(session.execute(select(Professional)).scalars().all())
    name_to_prof: dict[str, Professional] = {p.name: p for p in professionals}

    # Create enough seed users for the full expected set (idempotent via get-or-create)
    total_reviews = sum(len(r) for r in REVIEWS_BY_PROFESSIONAL.values())
    user_ids = _get_or_create_seed_users(session, total_reviews)

    inserted = 0
    user_idx = 0
    newly_inserted_prof_ids: list[str] = []
    for prof_name, reviews in REVIEWS_BY_PROFESSIONAL.items():
        professional = name_to_prof.get(prof_name)
        if not professional:
            logger.warning("Professional '%s' not found, skipping reviews.", prof_name)
            user_idx += len(reviews)  # keep user_idx in sync
            continue

        # Per-professional idempotency: skip if this pro already has reviews
        already_has_reviews = (
            session.execute(
                select(ProfessionalReview)
                .where(ProfessionalReview.professional_id == professional.id)
                .limit(1)
            )
            .scalars()
            .first()
        )
        if already_has_reviews:
            user_idx += len(reviews)  # keep user_idx in sync
            continue

        for review_data in reviews:
            review = ProfessionalReview(
                professional_id=professional.id,
                user_id=user_ids[user_idx],
                **review_data,
            )
            session.add(review)
            inserted += 1
            user_idx += 1
        newly_inserted_prof_ids.append(professional.id)

    if inserted == 0:
        logger.info("All reviews already seeded, skipping.")
        return

    session.flush()

    # Recompute denormalized fields only for professionals that got new reviews
    from app.services.professional_service import recompute_professional_stats

    for prof_id in newly_inserted_prof_ids:
        recompute_professional_stats(session, prof_id)

    session.commit()
    logger.info("Seeded %d reviews.", inserted)
