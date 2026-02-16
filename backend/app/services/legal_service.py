"""Legal Knowledge Base service."""

import uuid

from sqlalchemy import func, or_, select, text
from sqlmodel import Session

from app.models.legal import (
    Law,
    LawBookmark,
    LawCategory,
    LawJourneyStepLink,
    PropertyTypeApplicability,
    RelatedLaw,
)
from app.schemas.legal import LawFilter


class LawNotFoundError(Exception):
    """Raised when a law is not found."""

    pass


class BookmarkNotFoundError(Exception):
    """Raised when a bookmark is not found."""

    pass


class BookmarkAlreadyExistsError(Exception):
    """Raised when trying to bookmark an already bookmarked law."""

    pass


class LegalService:
    """
    Service for managing legal knowledge base.

    Provides methods for searching, retrieving, and bookmarking laws.
    """

    def get_laws(
        self,
        session: Session,
        filters: LawFilter,
    ) -> tuple[list[Law], int]:
        """
        Get paginated list of laws with optional filtering.

        Args:
            session: Database session
            filters: Filter parameters

        Returns:
            Tuple of (laws list, total count)
        """
        query = select(Law)

        # Apply filters
        if filters.category:
            query = query.where(Law.category == filters.category.value)

        if filters.property_type:
            query = query.where(
                or_(
                    Law.property_type == filters.property_type.value,
                    Law.property_type == PropertyTypeApplicability.ALL.value,
                )
            )

        if filters.state:
            # Join with state variations to filter by state
            from app.models.legal import StateVariation

            query = query.join(
                StateVariation,
                Law.id == StateVariation.law_id,
            ).where(StateVariation.state_code == filters.state.upper())

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = session.exec(count_query).scalar() or 0

        # Apply pagination
        offset = (filters.page - 1) * filters.page_size
        query = query.offset(offset).limit(filters.page_size)
        query = query.order_by(Law.category, Law.citation)

        laws = session.exec(query).scalars().all()
        return list(laws), total

    def get_law(
        self,
        session: Session,
        law_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
    ) -> Law:
        """
        Get a law by ID.

        Args:
            session: Database session
            law_id: Law ID
            user_id: Optional user ID to check bookmark status

        Returns:
            Law object

        Raises:
            LawNotFoundError: If law is not found
        """
        query = select(Law).where(Law.id == law_id)
        law = session.exec(query).scalars().first()

        if not law:
            raise LawNotFoundError(f"Law {law_id} not found")

        return law

    def get_law_by_citation(
        self,
        session: Session,
        citation: str,
    ) -> Law:
        """
        Get a law by its citation.

        Args:
            session: Database session
            citation: Law citation (e.g., "§ 433 BGB")

        Returns:
            Law object

        Raises:
            LawNotFoundError: If law is not found
        """
        query = select(Law).where(Law.citation == citation)
        law = session.exec(query).scalars().first()

        if not law:
            raise LawNotFoundError(f"Law with citation '{citation}' not found")

        return law

    def search_laws(
        self,
        session: Session,
        query_text: str,
        limit: int = 20,
    ) -> list[tuple[Law, float]]:
        """
        Search laws using full-text search.

        Args:
            session: Database session
            query_text: Search query
            limit: Maximum results

        Returns:
            List of (law, relevance_score) tuples
        """
        # Use PostgreSQL full-text search
        search_query = text("""
            SELECT
                law.id,
                ts_rank(law.search_vector, plainto_tsquery('english', :query)) as rank
            FROM law
            WHERE law.search_vector @@ plainto_tsquery('english', :query)
            ORDER BY rank DESC
            LIMIT :limit
        """)

        result = session.execute(search_query, {"query": query_text, "limit": limit})

        # Fetch full law objects
        laws_with_scores = []
        for row in result:
            law = self.get_law(session, row.id)
            laws_with_scores.append((law, float(row.rank)))

        return laws_with_scores

    def get_related_laws(
        self,
        session: Session,
        law_id: uuid.UUID,
    ) -> list[Law]:
        """
        Get laws related to a given law.

        Args:
            session: Database session
            law_id: Law ID

        Returns:
            List of related laws
        """
        query = (
            select(Law)
            .join(RelatedLaw, Law.id == RelatedLaw.related_law_id)
            .where(RelatedLaw.law_id == law_id)
        )
        return list(session.exec(query).scalars().all())

    def is_bookmarked(
        self,
        session: Session,
        law_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """
        Check if a law is bookmarked by a user.

        Args:
            session: Database session
            law_id: Law ID
            user_id: User ID

        Returns:
            True if bookmarked, False otherwise
        """
        query = select(LawBookmark).where(
            LawBookmark.law_id == law_id,
            LawBookmark.user_id == user_id,
        )
        bookmark = session.exec(query).scalars().first()
        return bookmark is not None

    def create_bookmark(
        self,
        session: Session,
        law_id: uuid.UUID,
        user_id: uuid.UUID,
        notes: str | None = None,
    ) -> LawBookmark:
        """
        Bookmark a law for a user.

        Args:
            session: Database session
            law_id: Law ID
            user_id: User ID
            notes: Optional notes

        Returns:
            Created bookmark

        Raises:
            LawNotFoundError: If law is not found
            BookmarkAlreadyExistsError: If already bookmarked
        """
        # Verify law exists
        self.get_law(session, law_id)

        # Check if already bookmarked
        if self.is_bookmarked(session, law_id, user_id):
            raise BookmarkAlreadyExistsError("Law is already bookmarked")

        bookmark = LawBookmark(
            user_id=user_id,
            law_id=law_id,
            notes=notes,
        )
        session.add(bookmark)
        session.commit()
        session.refresh(bookmark)

        return bookmark

    def delete_bookmark(
        self,
        session: Session,
        law_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """
        Remove a law bookmark.

        Args:
            session: Database session
            law_id: Law ID
            user_id: User ID

        Raises:
            BookmarkNotFoundError: If bookmark is not found
        """
        query = select(LawBookmark).where(
            LawBookmark.law_id == law_id,
            LawBookmark.user_id == user_id,
        )
        bookmark = session.exec(query).scalars().first()

        if not bookmark:
            raise BookmarkNotFoundError("Bookmark not found")

        session.delete(bookmark)
        session.commit()

    def get_user_bookmarks(
        self,
        session: Session,
        user_id: uuid.UUID,
    ) -> list[LawBookmark]:
        """
        Get all bookmarks for a user.

        Args:
            session: Database session
            user_id: User ID

        Returns:
            List of bookmarks with law data
        """
        query = (
            select(LawBookmark)
            .where(LawBookmark.user_id == user_id)
            .order_by(LawBookmark.created_at.desc())
        )
        return list(session.exec(query).scalars().all())

    def get_laws_for_journey_step(
        self,
        session: Session,
        step_content_key: str,
    ) -> list[tuple[Law, int]]:
        """
        Get laws relevant to a journey step.

        Args:
            session: Database session
            step_content_key: Journey step content key

        Returns:
            List of (law, relevance_score) tuples
        """
        query = (
            select(Law, LawJourneyStepLink.relevance_score)
            .join(LawJourneyStepLink, Law.id == LawJourneyStepLink.law_id)
            .where(LawJourneyStepLink.step_content_key == step_content_key)
            .order_by(LawJourneyStepLink.relevance_score.desc())
        )
        results = session.exec(query).all()
        return [(law, score) for law, score in results]

    def get_laws_by_category(
        self,
        session: Session,
        category: LawCategory,
    ) -> list[Law]:
        """
        Get all laws in a category.

        Args:
            session: Database session
            category: Law category

        Returns:
            List of laws
        """
        query = select(Law).where(Law.category == category.value).order_by(Law.citation)
        return list(session.exec(query).scalars().all())


# Singleton pattern
_legal_service: LegalService | None = None


def get_legal_service() -> LegalService:
    """Get the legal service singleton."""
    global _legal_service
    if _legal_service is None:
        _legal_service = LegalService()
    return _legal_service
