"""Tests for Content Library article API endpoints."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate
from app.models.article import (
    Article,
    ArticleCategory,
    ArticleStatus,
    DifficultyLevel,
)
from tests.utils.utils import random_email, random_lower_string


def get_auth_headers(client: TestClient, db: Session) -> tuple[dict[str, str], str]:
    """Create a user and return auth headers and user email."""
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    crud.create_user(session=db, user_create=user_in)

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    return headers, username


def create_sample_article(
    db: Session,
    slug: str | None = None,
    status: str = ArticleStatus.PUBLISHED.value,
) -> Article:
    """Create a sample article for testing."""
    if slug is None:
        slug = f"api-test-{uuid.uuid4().hex[:8]}"
    article = Article(
        id=uuid.uuid4(),
        slug=slug,
        title=f"Test Article {slug}",
        meta_description="Test meta description for API tests",
        category=ArticleCategory.BUYING_PROCESS.value,
        difficulty_level=DifficultyLevel.BEGINNER.value,
        status=status,
        excerpt="This is a test excerpt.",
        content="This is the test content for the article.",
        key_takeaways=["Key point one", "Key point two"],
        reading_time_minutes=1,
        view_count=0,
        author_name="Test Author",
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


def test_list_articles(client: TestClient, db: Session) -> None:
    """Test listing articles returns paginated results."""
    create_sample_article(db)

    r = client.get(f"{settings.API_V1_STR}/articles/")

    assert r.status_code == 200
    data = r.json()
    assert "data" in data
    assert "count" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data


def test_list_articles_no_auth_required(client: TestClient, db: Session) -> None:  # noqa: ARG001
    """Test that listing articles does not require authentication."""
    r = client.get(f"{settings.API_V1_STR}/articles/")
    assert r.status_code == 200


def test_list_articles_filter_category(client: TestClient, db: Session) -> None:
    """Test filtering articles by category."""
    create_sample_article(db, slug=f"filter-cat-{uuid.uuid4().hex[:8]}")

    r = client.get(
        f"{settings.API_V1_STR}/articles/",
        params={"category": "buying_process"},
    )

    assert r.status_code == 200
    data = r.json()
    for article in data["data"]:
        assert article["category"] == "buying_process"


def test_list_articles_excludes_drafts(client: TestClient, db: Session) -> None:
    """Test that draft articles are not returned in public list."""
    draft_slug = f"draft-hidden-{uuid.uuid4().hex[:8]}"
    create_sample_article(db, slug=draft_slug, status=ArticleStatus.DRAFT.value)

    r = client.get(f"{settings.API_V1_STR}/articles/")

    assert r.status_code == 200
    slugs = [a["slug"] for a in r.json()["data"]]
    assert draft_slug not in slugs


def test_get_article_by_slug(client: TestClient, db: Session) -> None:
    """Test getting article detail by slug."""
    article = create_sample_article(db, slug=f"detail-test-{uuid.uuid4().hex[:8]}")

    r = client.get(f"{settings.API_V1_STR}/articles/{article.slug}")

    assert r.status_code == 200
    data = r.json()
    assert data["slug"] == article.slug
    assert data["title"] == article.title
    assert "content" in data
    assert "key_takeaways" in data
    assert "helpful_count" in data
    assert "related_articles" in data


def test_get_article_increments_view_count(client: TestClient, db: Session) -> None:
    """Test that fetching an article increments the view count."""
    article = create_sample_article(db, slug=f"view-inc-{uuid.uuid4().hex[:8]}")
    initial_count = article.view_count

    r = client.get(f"{settings.API_V1_STR}/articles/{article.slug}")

    assert r.status_code == 200
    assert r.json()["view_count"] == initial_count + 1


def test_get_article_not_found(client: TestClient) -> None:
    """Test 404 for non-existent article slug."""
    r = client.get(f"{settings.API_V1_STR}/articles/nonexistent-slug")
    assert r.status_code == 404


def test_search_articles(client: TestClient, db: Session) -> None:
    """Test searching articles."""
    create_sample_article(db, slug=f"search-test-{uuid.uuid4().hex[:8]}")

    r = client.get(
        f"{settings.API_V1_STR}/articles/search",
        params={"q": "test content"},
    )

    assert r.status_code == 200
    data = r.json()
    assert "data" in data
    assert "count" in data
    assert "query" in data


def test_search_articles_min_query_length(client: TestClient) -> None:
    """Test that search requires minimum 2 characters."""
    r = client.get(
        f"{settings.API_V1_STR}/articles/search",
        params={"q": "a"},
    )
    assert r.status_code == 422


def test_get_categories(client: TestClient, db: Session) -> None:  # noqa: ARG001
    """Test getting article categories."""
    r = client.get(f"{settings.API_V1_STR}/articles/categories")

    assert r.status_code == 200
    data = r.json()
    assert len(data) == 4
    keys = [c["key"] for c in data]
    assert "buying_process" in keys
    assert "costs_and_taxes" in keys
    assert "regulations" in keys
    assert "common_pitfalls" in keys


def test_rate_article_requires_auth(client: TestClient, db: Session) -> None:
    """Test that rating requires authentication."""
    article = create_sample_article(db, slug=f"rate-noauth-{uuid.uuid4().hex[:8]}")

    r = client.post(
        f"{settings.API_V1_STR}/articles/{article.slug}/rate",
        json={"is_helpful": True},
    )

    assert r.status_code in (401, 403)


def test_rate_article_with_auth(client: TestClient, db: Session) -> None:
    """Test rating an article with authentication."""
    headers, _ = get_auth_headers(client, db)
    article = create_sample_article(db, slug=f"rate-auth-{uuid.uuid4().hex[:8]}")

    r = client.post(
        f"{settings.API_V1_STR}/articles/{article.slug}/rate",
        json={"is_helpful": True},
        headers=headers,
    )

    assert r.status_code == 201
    data = r.json()
    assert "helpful_count" in data
    assert "not_helpful_count" in data
    assert data["user_rating"] is True


def test_create_article_requires_superuser(client: TestClient, db: Session) -> None:
    """Test that creating an article requires superuser privileges."""
    headers, _ = get_auth_headers(client, db)

    r = client.post(
        f"{settings.API_V1_STR}/articles/",
        json={
            "title": "New Article",
            "slug": "new-article",
            "meta_description": "Description",
            "category": "buying_process",
            "difficulty_level": "beginner",
            "excerpt": "Excerpt",
            "content": "Content",
            "author_name": "Author",
        },
        headers=headers,
    )

    assert r.status_code == 403


def test_create_article_as_superuser(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test creating an article as superuser."""
    slug = f"admin-create-{uuid.uuid4().hex[:8]}"

    r = client.post(
        f"{settings.API_V1_STR}/articles/",
        json={
            "title": "Admin Created Article",
            "slug": slug,
            "meta_description": "Description",
            "category": "buying_process",
            "difficulty_level": "beginner",
            "excerpt": "Excerpt",
            "content": "Content text here for the article body",
            "author_name": "Admin",
        },
        headers=superuser_token_headers,
    )

    assert r.status_code == 201
    assert r.json()["slug"] == slug


def test_delete_article_requires_superuser(client: TestClient, db: Session) -> None:
    """Test that deleting an article requires superuser privileges."""
    headers, _ = get_auth_headers(client, db)
    article = create_sample_article(db, slug=f"del-nosu-{uuid.uuid4().hex[:8]}")

    r = client.delete(
        f"{settings.API_V1_STR}/articles/{article.id}",
        headers=headers,
    )

    assert r.status_code == 403


def test_delete_article_as_superuser(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    """Test deleting an article as superuser."""
    article = create_sample_article(db, slug=f"del-su-{uuid.uuid4().hex[:8]}")

    r = client.delete(
        f"{settings.API_V1_STR}/articles/{article.id}",
        headers=superuser_token_headers,
    )

    assert r.status_code == 204
