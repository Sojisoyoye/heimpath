"""Tests for seed_reviews module.

These tests verify the seed_reviews function and its data.
The seed_reviews function is called during init_db -> seed_professionals,
so reviews should already exist in the test DB. If not, we seed them first.
"""

from sqlmodel import Session, select

from app.core.seed_reviews import (
    REVIEWS_BY_PROFESSIONAL,
    seed_reviews,
)
from app.models.professional import Professional, ProfessionalReview
from app.models.user import User


def _ensure_reviews_seeded(db: Session) -> None:
    """Ensure seed reviews exist in the DB (handles stale local state)."""
    existing = db.execute(select(ProfessionalReview).limit(1)).scalars().first()
    if not existing:
        seed_reviews(db)


def test_seed_reviews_creates_reviews(db: Session) -> None:
    """Test that seed_reviews creates reviews for seeded professionals."""
    _ensure_reviews_seeded(db)

    reviews = db.execute(select(ProfessionalReview)).scalars().all()
    expected_count = sum(len(r) for r in REVIEWS_BY_PROFESSIONAL.values())
    assert len(reviews) >= expected_count

    for review in reviews:
        assert 1 <= review.rating <= 5
        assert review.professional_id is not None
        assert review.user_id is not None


def test_seed_reviews_creates_seed_users(db: Session) -> None:
    """Test that seed_reviews creates inactive seed users for authorship."""
    _ensure_reviews_seeded(db)

    seed_users = (
        db.execute(
            select(User).where(User.email.like("seed-reviewer-%@heimpath.example"))
        )
        .scalars()
        .all()
    )
    assert len(seed_users) > 0

    for user in seed_users:
        assert user.is_active is False
        assert user.full_name is not None
        assert user.full_name.startswith("Seed Reviewer")


def test_seed_reviews_idempotent(db: Session) -> None:
    """Test that seed_reviews skips when reviews already exist."""
    _ensure_reviews_seeded(db)

    count_before = len(db.execute(select(ProfessionalReview)).scalars().all())
    seed_reviews(db)
    count_after = len(db.execute(select(ProfessionalReview)).scalars().all())

    assert count_after == count_before


def test_seed_reviews_updates_professional_stats(db: Session) -> None:
    """Test that seed_reviews recomputed professional stats after seeding."""
    _ensure_reviews_seeded(db)

    for prof_name in REVIEWS_BY_PROFESSIONAL:
        professional = (
            db.execute(select(Professional).where(Professional.name == prof_name))
            .scalars()
            .first()
        )
        if professional:
            assert professional.review_count > 0
            assert professional.average_rating > 0
            if professional.recommendation_rate is not None:
                assert 0 <= professional.recommendation_rate <= 100
            break


def test_seed_reviews_links_to_valid_professionals(db: Session) -> None:
    """Test that all seeded reviews reference existing professionals."""
    _ensure_reviews_seeded(db)

    reviews = db.execute(select(ProfessionalReview)).scalars().all()
    prof_ids = {p.id for p in db.execute(select(Professional)).scalars().all()}

    for review in reviews:
        assert review.professional_id in prof_ids


def test_seed_reviews_links_to_valid_users(db: Session) -> None:
    """Test that all seeded reviews reference existing users."""
    _ensure_reviews_seeded(db)

    reviews = db.execute(select(ProfessionalReview)).scalars().all()
    user_ids = {u.id for u in db.execute(select(User)).scalars().all()}

    for review in reviews:
        assert review.user_id in user_ids


def test_seed_reviews_have_valid_ratings(db: Session) -> None:
    """Test that all seeded reviews have valid rating values."""
    _ensure_reviews_seeded(db)

    reviews = db.execute(select(ProfessionalReview)).scalars().all()

    for review in reviews:
        assert 1 <= review.rating <= 5
        if review.response_time_rating is not None:
            assert 1 <= review.response_time_rating <= 5


def test_seed_review_data_integrity() -> None:
    """Test that seed review data constants have valid structure."""
    valid_services = {"buying", "selling", "rental", "tax", "legal"}

    for prof_name, reviews in REVIEWS_BY_PROFESSIONAL.items():
        assert len(reviews) > 0, f"No reviews for {prof_name}"

        for review in reviews:
            assert "rating" in review
            assert 1 <= review["rating"] <= 5

            if "service_used" in review:
                assert review["service_used"] in valid_services

            if "response_time_rating" in review:
                assert 1 <= review["response_time_rating"] <= 5

            if "would_recommend" in review:
                assert isinstance(review["would_recommend"], bool)
