"""Tests for Glossary API endpoints."""

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models.glossary import GlossaryCategory, GlossaryTerm

BASE = f"{settings.API_V1_STR}/glossary"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_term(db: Session, **overrides) -> GlossaryTerm:
    """Create a glossary term in the database."""
    defaults = {
        "term_de": "Grundbuch",
        "term_en": "Land Registry",
        "slug": "grundbuch",
        "definition_short": "Official register of property ownership.",
        "definition_long": "The Grundbuch is the official land registry in Germany.",
        "category": GlossaryCategory.LEGAL.value,
        "example_usage": "Check the Grundbuch before buying.",
        "related_terms": [],
    }
    defaults.update(overrides)
    term = GlossaryTerm(**defaults)
    db.add(term)
    db.commit()
    db.refresh(term)
    return term


def _cleanup_terms(db: Session) -> None:
    """Remove all glossary terms."""
    terms = db.exec(select(GlossaryTerm)).all()
    for t in terms:
        db.delete(t)
    db.commit()


# ---------------------------------------------------------------------------
# GET /glossary/
# ---------------------------------------------------------------------------


class TestListTerms:
    """Tests for the glossary list endpoint."""

    def test_returns_200(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        _create_term(db)
        r = client.get(f"{BASE}/")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        _cleanup_terms(db)

    def test_returns_empty_list(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        r = client.get(f"{BASE}/")
        assert r.status_code == 200
        data = r.json()
        assert data["data"] == []
        assert data["total"] == 0

    def test_filters_by_category(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        _create_term(db, slug="notar", term_de="Notar", category=GlossaryCategory.BUYING_PROCESS.value)
        _create_term(
            db,
            slug="grunderwerbsteuer",
            term_de="Grunderwerbsteuer",
            category=GlossaryCategory.COSTS_TAXES.value,
        )
        r = client.get(f"{BASE}/?category=costs_taxes")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["data"][0]["slug"] == "grunderwerbsteuer"
        _cleanup_terms(db)

    def test_pagination(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        for i in range(5):
            _create_term(db, slug=f"term-{i}", term_de=f"Term {i}")
        r = client.get(f"{BASE}/?page=1&page_size=2")
        assert r.status_code == 200
        data = r.json()
        assert len(data["data"]) == 2
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["page_size"] == 2
        _cleanup_terms(db)


# ---------------------------------------------------------------------------
# GET /glossary/search
# ---------------------------------------------------------------------------


class TestSearchTerms:
    """Tests for the glossary search endpoint."""

    def test_returns_200(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        _create_term(db)
        r = client.get(f"{BASE}/search?q=grundbuch")
        assert r.status_code == 200
        data = r.json()
        assert "query" in data
        assert "results" in data
        assert "total" in data
        _cleanup_terms(db)

    def test_returns_empty_for_no_match(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        r = client.get(f"{BASE}/search?q=nonexistent")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 0
        assert data["results"] == []

    def test_rejects_short_query(self, client: TestClient) -> None:
        r = client.get(f"{BASE}/search?q=a")
        assert r.status_code == 422

    def test_rejects_missing_query(self, client: TestClient) -> None:
        r = client.get(f"{BASE}/search")
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# GET /glossary/categories
# ---------------------------------------------------------------------------


class TestListCategories:
    """Tests for the glossary categories endpoint."""

    def test_returns_200(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        _create_term(db)
        r = client.get(f"{BASE}/categories")
        assert r.status_code == 200
        data = r.json()
        assert "categories" in data
        assert len(data["categories"]) >= 1
        _cleanup_terms(db)

    def test_returns_empty_categories(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        r = client.get(f"{BASE}/categories")
        assert r.status_code == 200
        data = r.json()
        assert data["categories"] == []

    def test_category_has_expected_fields(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        _create_term(db)
        r = client.get(f"{BASE}/categories")
        data = r.json()
        cat = data["categories"][0]
        assert "id" in cat
        assert "name" in cat
        assert "count" in cat
        assert cat["count"] == 1
        _cleanup_terms(db)


# ---------------------------------------------------------------------------
# GET /glossary/{slug}
# ---------------------------------------------------------------------------


class TestGetTerm:
    """Tests for the glossary term detail endpoint."""

    def test_returns_200(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        _create_term(db)
        r = client.get(f"{BASE}/grundbuch")
        assert r.status_code == 200
        data = r.json()
        assert data["slug"] == "grundbuch"
        assert data["term_de"] == "Grundbuch"
        assert data["term_en"] == "Land Registry"
        assert "definition_long" in data
        assert "related_terms" in data
        _cleanup_terms(db)

    def test_returns_404_for_missing_slug(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        r = client.get(f"{BASE}/nonexistent-term")
        assert r.status_code == 404

    def test_resolves_related_terms(self, client: TestClient, db: Session) -> None:
        _cleanup_terms(db)
        _create_term(db, slug="notar", term_de="Notar", related_terms=[])
        _create_term(
            db,
            slug="grundbuch-detail",
            term_de="Grundbuch Detail",
            related_terms=["notar"],
        )
        r = client.get(f"{BASE}/grundbuch-detail")
        assert r.status_code == 200
        data = r.json()
        assert len(data["related_terms"]) == 1
        assert data["related_terms"][0]["slug"] == "notar"
        _cleanup_terms(db)
