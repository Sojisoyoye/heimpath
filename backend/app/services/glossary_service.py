"""Glossary service for German real estate terminology."""

from sqlalchemy import func, select, text
from sqlmodel import Session

from app.models.glossary import GlossaryCategory, GlossaryTerm


class GlossaryTermNotFoundError(Exception):
    """Raised when a glossary term is not found."""

    pass


class GlossarySlugExistsError(Exception):
    """Raised when a glossary term with the same slug already exists."""

    pass


def get_terms(
    session: Session,
    category: GlossaryCategory | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[GlossaryTerm], int]:
    """Get paginated list of glossary terms with optional category filter.

    Args:
        session: Database session
        category: Optional category filter
        page: Page number (1-based)
        page_size: Items per page

    Returns:
        Tuple of (terms list, total count)
    """
    query = select(GlossaryTerm)

    if category:
        query = query.where(GlossaryTerm.category == category.value)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).scalar() or 0

    # Apply pagination and ordering
    offset = (page - 1) * page_size
    query = query.order_by(GlossaryTerm.term_de).offset(offset).limit(page_size)

    terms = session.exec(query).scalars().all()
    return list(terms), total


def get_term_by_slug(
    session: Session,
    slug: str,
) -> GlossaryTerm:
    """Get a glossary term by its URL slug.

    Args:
        session: Database session
        slug: URL slug

    Returns:
        GlossaryTerm object

    Raises:
        GlossaryTermNotFoundError: If term is not found
    """
    query = select(GlossaryTerm).where(GlossaryTerm.slug == slug)
    term = session.exec(query).scalars().first()

    if not term:
        raise GlossaryTermNotFoundError(f"Glossary term with slug '{slug}' not found")

    return term


def search_terms(
    session: Session,
    query_text: str,
    limit: int = 20,
) -> list[GlossaryTerm]:
    """Search glossary terms using full-text search.

    Args:
        session: Database session
        query_text: Search query
        limit: Maximum results

    Returns:
        List of matching glossary terms ordered by relevance
    """
    search_query = text("""
        SELECT
            glossary_term.id,
            ts_rank(glossary_term.search_vector, plainto_tsquery('english', :query)) as rank
        FROM glossary_term
        WHERE glossary_term.search_vector @@ plainto_tsquery('english', :query)
        ORDER BY rank DESC
        LIMIT :limit
    """)

    result = session.execute(search_query, {"query": query_text, "limit": limit})
    rows = list(result)

    if not rows:
        return []

    # Fetch all matched terms in a single query to avoid N+1
    term_ids = [row.id for row in rows]
    terms = list(
        session.exec(select(GlossaryTerm).where(GlossaryTerm.id.in_(term_ids)))
        .scalars()
        .all()
    )
    # Restore rank order
    id_order = {tid: i for i, tid in enumerate(term_ids)}
    terms.sort(key=lambda t: id_order.get(t.id, len(term_ids)))
    return terms


def get_categories(
    session: Session,
) -> list[tuple[str, int]]:
    """Get distinct categories with term counts.

    Args:
        session: Database session

    Returns:
        List of (category_value, count) tuples
    """
    query = (
        select(GlossaryTerm.category, func.count(GlossaryTerm.id))
        .group_by(GlossaryTerm.category)
        .order_by(GlossaryTerm.category)
    )
    results = session.execute(query).all()
    return [(str(row[0]), int(row[1])) for row in results]


def get_related_terms(
    session: Session,
    slugs: list[str],
) -> list[GlossaryTerm]:
    """Batch fetch glossary terms by slug list.

    Args:
        session: Database session
        slugs: List of term slugs

    Returns:
        List of matching glossary terms
    """
    if not slugs:
        return []

    query = select(GlossaryTerm).where(GlossaryTerm.slug.in_(slugs))
    return list(session.exec(query).scalars().all())


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------


def create_term(session: Session, data: dict) -> GlossaryTerm:
    """Create a new glossary term.

    Args:
        session: Database session
        data: Term field values

    Returns:
        Created GlossaryTerm instance

    Raises:
        GlossarySlugExistsError: If slug already exists
    """
    existing = session.exec(
        select(GlossaryTerm).where(GlossaryTerm.slug == data.get("slug"))
    ).first()
    if existing:
        raise GlossarySlugExistsError(
            f"A term with slug '{data['slug']}' already exists"
        )

    term = GlossaryTerm(**data)
    session.add(term)
    session.commit()
    session.refresh(term)
    return term


def update_term(session: Session, slug: str, data: dict) -> GlossaryTerm:
    """Update an existing glossary term.

    Args:
        session: Database session
        slug: Term slug
        data: Fields to update (partial)

    Returns:
        Updated GlossaryTerm instance

    Raises:
        GlossaryTermNotFoundError: If term is not found
        GlossarySlugExistsError: If new slug conflicts with existing term
    """
    term = session.exec(select(GlossaryTerm).where(GlossaryTerm.slug == slug)).first()
    if not term:
        raise GlossaryTermNotFoundError(f"Glossary term with slug '{slug}' not found")

    new_slug = data.get("slug")
    if new_slug and new_slug != slug:
        conflict = session.exec(
            select(GlossaryTerm).where(GlossaryTerm.slug == new_slug)
        ).first()
        if conflict:
            raise GlossarySlugExistsError(
                f"A term with slug '{new_slug}' already exists"
            )

    for field, value in data.items():
        setattr(term, field, value)

    session.commit()
    session.refresh(term)
    return term


def delete_term(session: Session, slug: str) -> None:
    """Delete a glossary term.

    Args:
        session: Database session
        slug: Term slug

    Raises:
        GlossaryTermNotFoundError: If term is not found
    """
    term = session.exec(select(GlossaryTerm).where(GlossaryTerm.slug == slug)).first()
    if not term:
        raise GlossaryTermNotFoundError(f"Glossary term with slug '{slug}' not found")

    session.delete(term)
    session.commit()
