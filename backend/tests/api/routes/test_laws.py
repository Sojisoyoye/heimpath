"""Tests for Legal Knowledge Base API endpoints."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate
from app.models.legal import (
    Law,
    LawCategory,
    PropertyTypeApplicability,
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


def create_sample_law(db: Session, citation: str | None = None) -> Law:
    """Create a sample law for testing."""
    if citation is None:
        citation = f"§ {uuid.uuid4().hex[:6]} BGB"
    law = Law(
        id=uuid.uuid4(),
        citation=citation,
        title_de="Vertragstypische Pflichten beim Kaufvertrag",
        title_en="Typical Obligations in a Purchase Contract",
        category=LawCategory.BUYING_PROCESS.value,
        property_type=PropertyTypeApplicability.ALL.value,
        one_line_summary="Defines buyer and seller obligations in property sales.",
        short_summary="This section defines the core obligations of buyers and sellers.",
        detailed_explanation="In German property law, this section is fundamental.",
        real_world_example="When buying an apartment in Berlin...",
        buyer_implications="As a buyer, you are obligated to pay the purchase price.",
        seller_implications="As a seller, you must transfer ownership.",
    )
    db.add(law)
    db.commit()
    db.refresh(law)
    return law


def test_list_laws(client: TestClient, db: Session) -> None:
    """Test listing laws returns paginated results."""
    headers, _ = get_auth_headers(client, db)

    r = client.get(f"{settings.API_V1_STR}/laws/", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert "count" in data
    assert "data" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data


def test_list_laws_with_data(client: TestClient, db: Session) -> None:
    """Test listing laws with data."""
    headers, _ = get_auth_headers(client, db)
    create_sample_law(db)

    r = client.get(f"{settings.API_V1_STR}/laws/", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["count"] >= 1
    assert len(data["data"]) >= 1


def test_list_laws_filter_by_category(client: TestClient, db: Session) -> None:
    """Test filtering laws by category."""
    headers, _ = get_auth_headers(client, db)
    create_sample_law(db)

    r = client.get(
        f"{settings.API_V1_STR}/laws/",
        headers=headers,
        params={"category": "buying_process"},
    )

    assert r.status_code == 200
    data = r.json()
    assert data["count"] >= 1
    for item in data["data"]:
        assert item["category"] == "buying_process"


def test_get_law_details(client: TestClient, db: Session) -> None:
    """Test getting law details."""
    headers, _ = get_auth_headers(client, db)
    law = create_sample_law(db)

    r = client.get(f"{settings.API_V1_STR}/laws/{law.id}", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["id"] == str(law.id)
    assert data["citation"] == law.citation
    assert data["title_en"] == "Typical Obligations in a Purchase Contract"
    assert data["category"] == "buying_process"
    assert data["is_bookmarked"] is False


def test_get_law_not_found(client: TestClient, db: Session) -> None:
    """Test getting non-existent law."""
    headers, _ = get_auth_headers(client, db)
    fake_id = str(uuid.uuid4())

    r = client.get(f"{settings.API_V1_STR}/laws/{fake_id}", headers=headers)

    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


def test_get_categories(client: TestClient, db: Session) -> None:
    """Test getting law categories."""
    headers, _ = get_auth_headers(client, db)

    r = client.get(f"{settings.API_V1_STR}/laws/categories", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert "categories" in data
    assert len(data["categories"]) == 5  # 5 categories defined


def test_search_laws(client: TestClient, db: Session) -> None:
    """Test searching laws."""
    headers, _ = get_auth_headers(client, db)
    create_sample_law(db)

    r = client.get(
        f"{settings.API_V1_STR}/laws/search",
        headers=headers,
        params={"q": "purchase contract"},
    )

    assert r.status_code == 200
    data = r.json()
    assert data["query"] == "purchase contract"


def test_create_bookmark(client: TestClient, db: Session) -> None:
    """Test bookmarking a law."""
    headers, _ = get_auth_headers(client, db)
    law = create_sample_law(db)

    r = client.post(
        f"{settings.API_V1_STR}/laws/{law.id}/bookmark",
        headers=headers,
        json={"notes": "Important for my case"},
    )

    assert r.status_code == 201
    data = r.json()
    assert data["law_id"] == str(law.id)
    assert data["notes"] == "Important for my case"


def test_create_bookmark_duplicate(client: TestClient, db: Session) -> None:
    """Test that duplicate bookmarks are rejected."""
    headers, _ = get_auth_headers(client, db)
    law = create_sample_law(db)

    # First bookmark
    client.post(
        f"{settings.API_V1_STR}/laws/{law.id}/bookmark",
        headers=headers,
        json={},
    )

    # Duplicate bookmark
    r = client.post(
        f"{settings.API_V1_STR}/laws/{law.id}/bookmark",
        headers=headers,
        json={},
    )

    assert r.status_code == 409
    assert "already bookmarked" in r.json()["detail"].lower()


def test_delete_bookmark(client: TestClient, db: Session) -> None:
    """Test removing a bookmark."""
    headers, _ = get_auth_headers(client, db)
    law = create_sample_law(db)

    # Create bookmark first
    client.post(
        f"{settings.API_V1_STR}/laws/{law.id}/bookmark",
        headers=headers,
        json={},
    )

    # Delete bookmark
    r = client.delete(
        f"{settings.API_V1_STR}/laws/{law.id}/bookmark",
        headers=headers,
    )

    assert r.status_code == 200
    assert "removed" in r.json()["message"].lower()


def test_delete_bookmark_not_found(client: TestClient, db: Session) -> None:
    """Test deleting non-existent bookmark."""
    headers, _ = get_auth_headers(client, db)
    law = create_sample_law(db)

    r = client.delete(
        f"{settings.API_V1_STR}/laws/{law.id}/bookmark",
        headers=headers,
    )

    assert r.status_code == 404


def test_get_bookmarks(client: TestClient, db: Session) -> None:
    """Test getting user bookmarks."""
    headers, _ = get_auth_headers(client, db)
    law = create_sample_law(db)

    # Create bookmark
    client.post(
        f"{settings.API_V1_STR}/laws/{law.id}/bookmark",
        headers=headers,
        json={"notes": "My notes"},
    )

    r = client.get(f"{settings.API_V1_STR}/laws/bookmarks", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["count"] >= 1
    assert len(data["data"]) >= 1
    # Check that the law citation is present
    citations = [b["law"]["citation"] for b in data["data"]]
    assert law.citation in citations


def test_get_law_shows_bookmark_status(client: TestClient, db: Session) -> None:
    """Test that law detail shows bookmark status."""
    headers, _ = get_auth_headers(client, db)
    law = create_sample_law(db)

    # Before bookmarking
    r = client.get(f"{settings.API_V1_STR}/laws/{law.id}", headers=headers)
    assert r.json()["is_bookmarked"] is False

    # Bookmark
    client.post(
        f"{settings.API_V1_STR}/laws/{law.id}/bookmark",
        headers=headers,
        json={},
    )

    # After bookmarking
    r = client.get(f"{settings.API_V1_STR}/laws/{law.id}", headers=headers)
    assert r.json()["is_bookmarked"] is True


def test_bookmark_unauthenticated(client: TestClient, db: Session) -> None:
    """Test that unauthenticated users cannot bookmark laws."""
    law = create_sample_law(db)
    r = client.post(f"{settings.API_V1_STR}/laws/{law.id}/bookmark", json={})
    assert r.status_code == 401


def test_get_laws_for_journey_step(client: TestClient, db: Session) -> None:
    """Test getting laws for a journey step."""
    headers, _ = get_auth_headers(client, db)

    r = client.get(
        f"{settings.API_V1_STR}/laws/by-journey-step/research_budget",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert "data" in data
    assert data["step_content_key"] == "research_budget"
