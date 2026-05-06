"""Tests for Global Search API endpoint."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate
from app.models.article import Article, ArticleCategory, ArticleStatus, DifficultyLevel
from app.models.legal import Law, LawCategory, PropertyTypeApplicability
from tests.utils.utils import random_email, random_lower_string


def get_auth_headers(client: TestClient, db: Session) -> dict[str, str]:
    """Create a user and return auth headers."""
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    crud.create_user(session=db, user_create=user_in)

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def create_sample_law(db: Session) -> Law:
    """Create a sample law with search-friendly content."""
    law = Law(
        id=uuid.uuid4(),
        citation=f"§ {uuid.uuid4().hex[:6]} BGB",
        title_de="Vertragstypische Pflichten beim Kaufvertrag",
        title_en="Typical Obligations in a Purchase Contract",
        category=LawCategory.BUYING_PROCESS.value,
        property_type=PropertyTypeApplicability.ALL.value,
        one_line_summary="Defines buyer and seller obligations in property sales.",
        short_summary="This section defines the core obligations of buyers and sellers.",
        detailed_explanation="In German property law, this section is fundamental.",
    )
    db.add(law)
    db.commit()
    db.refresh(law)
    return law


def create_sample_article(db: Session) -> Article:
    """Create a sample published article with search-friendly content."""
    article = Article(
        id=uuid.uuid4(),
        slug=f"test-article-{uuid.uuid4().hex[:8]}",
        title="Guide to Buying Property in Germany",
        meta_description="A comprehensive guide for foreign buyers.",
        category=ArticleCategory.BUYING_PROCESS.value,
        difficulty_level=DifficultyLevel.BEGINNER.value,
        status=ArticleStatus.PUBLISHED.value,
        excerpt="Everything you need to know about buying property in Germany.",
        content="This article covers the complete process of buying property...",
        author_name="HeimPath Team",
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


def test_search_unauthenticated(client: TestClient) -> None:
    """Test that unauthenticated requests are rejected."""
    r = client.get(f"{settings.API_V1_STR}/search/?q=property")
    assert r.status_code in (401, 403)


def test_search_empty_query(client: TestClient, db: Session) -> None:
    """Test that empty query returns 422."""
    headers = get_auth_headers(client, db)
    r = client.get(f"{settings.API_V1_STR}/search/?q=", headers=headers)
    assert r.status_code == 422


def test_search_single_char_query(client: TestClient, db: Session) -> None:
    """Test that single-char query returns 422."""
    headers = get_auth_headers(client, db)
    r = client.get(f"{settings.API_V1_STR}/search/?q=a", headers=headers)
    assert r.status_code == 422


def test_search_valid_query_structure(client: TestClient, db: Session) -> None:
    """Test that a valid query returns the expected response structure."""
    headers = get_auth_headers(client, db)
    r = client.get(f"{settings.API_V1_STR}/search/?q=property", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert "query" in data
    assert "laws" in data
    assert "articles" in data
    assert "total_count" in data
    assert data["query"] == "property"
    assert isinstance(data["laws"], list)
    assert isinstance(data["articles"], list)


def test_search_returns_results(client: TestClient, db: Session) -> None:
    """Test that search finds matching laws and articles."""
    headers = get_auth_headers(client, db)
    create_sample_law(db)
    create_sample_article(db)

    r = client.get(f"{settings.API_V1_STR}/search/?q=property", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["total_count"] == len(data["laws"]) + len(data["articles"])

    # Verify result item structure
    for item in data["laws"] + data["articles"]:
        assert "id" in item
        assert "title" in item
        assert "snippet" in item
        assert "result_type" in item
        assert "url_path" in item


def test_search_respects_limit(client: TestClient, db: Session) -> None:
    """Test that search respects the limit parameter."""
    headers = get_auth_headers(client, db)
    r = client.get(f"{settings.API_V1_STR}/search/?q=property&limit=1", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert len(data["laws"]) <= 1
    assert len(data["articles"]) <= 1


def test_search_no_results(client: TestClient, db: Session) -> None:
    """Test search with a query that matches nothing."""
    headers = get_auth_headers(client, db)
    r = client.get(
        f"{settings.API_V1_STR}/search/?q=xyznonexistent123", headers=headers
    )

    assert r.status_code == 200
    data = r.json()
    assert data["total_count"] == 0
    assert data["laws"] == []
    assert data["articles"] == []
