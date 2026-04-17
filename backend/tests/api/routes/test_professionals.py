"""Tests for Professional network directory API endpoints."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate
from app.models.professional import Professional, ProfessionalType
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


def create_sample_professional(
    db: Session,
    name: str | None = None,
    professional_type: str = ProfessionalType.LAWYER.value,
    city: str = "Berlin",
) -> Professional:
    """Create a sample professional for testing."""
    if name is None:
        name = f"Test Professional {uuid.uuid4().hex[:8]}"
    professional = Professional(
        id=uuid.uuid4(),
        name=name,
        type=professional_type,
        city=city,
        languages="German, English",
        description="Test professional description.",
        email="test@example.de",
        is_verified=True,
        average_rating=0.0,
        review_count=0,
    )
    db.add(professional)
    db.commit()
    db.refresh(professional)
    return professional


def test_list_professionals(client: TestClient, db: Session) -> None:
    """Test listing professionals returns paginated results."""
    create_sample_professional(db)

    r = client.get(f"{settings.API_V1_STR}/professionals/")

    assert r.status_code == 200
    data = r.json()
    assert "data" in data
    assert "count" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data


def test_list_professionals_no_auth_required(client: TestClient) -> None:
    """Test that listing professionals does not require authentication."""
    r = client.get(f"{settings.API_V1_STR}/professionals/")
    assert r.status_code == 200


def test_list_professionals_filter_by_type(client: TestClient, db: Session) -> None:
    """Test filtering professionals by type."""
    create_sample_professional(db, professional_type=ProfessionalType.NOTARY.value)

    r = client.get(
        f"{settings.API_V1_STR}/professionals/",
        params={"type": "notary"},
    )

    assert r.status_code == 200
    data = r.json()
    for prof in data["data"]:
        assert prof["type"] == "notary"


def test_list_professionals_filter_by_city(client: TestClient, db: Session) -> None:
    """Test filtering professionals by city."""
    create_sample_professional(db, city="Hamburg")

    r = client.get(
        f"{settings.API_V1_STR}/professionals/",
        params={"city": "Hamburg"},
    )

    assert r.status_code == 200
    data = r.json()
    for prof in data["data"]:
        assert prof["city"] == "Hamburg"


def test_list_professionals_filter_by_language(client: TestClient, db: Session) -> None:
    """Test filtering professionals by language."""
    create_sample_professional(db)
    # Default languages is "German, English"

    r = client.get(
        f"{settings.API_V1_STR}/professionals/",
        params={"language": "English", "page_size": 100},
    )

    assert r.status_code == 200
    data = r.json()
    assert data["total"] > 0
    for prof in data["data"]:
        assert "English" in prof["languages"]


def test_list_professionals_filter_by_min_rating(
    client: TestClient,
    db: Session,  # noqa: ARG001
) -> None:
    """Test filtering professionals by minimum rating."""
    r = client.get(
        f"{settings.API_V1_STR}/professionals/",
        params={"min_rating": 4.5},
    )

    assert r.status_code == 200
    data = r.json()
    for prof in data["data"]:
        assert prof["average_rating"] >= 4.5


def test_get_professional_detail(client: TestClient, db: Session) -> None:
    """Test getting professional detail by ID."""
    professional = create_sample_professional(db)

    r = client.get(f"{settings.API_V1_STR}/professionals/{professional.id}")

    assert r.status_code == 200
    data = r.json()
    assert data["id"] == str(professional.id)
    assert data["name"] == professional.name
    assert "reviews" in data


def test_get_professional_not_found(client: TestClient) -> None:
    """Test 404 for non-existent professional."""
    fake_id = uuid.uuid4()
    r = client.get(f"{settings.API_V1_STR}/professionals/{fake_id}")
    assert r.status_code == 404


def test_create_review_requires_auth(client: TestClient, db: Session) -> None:
    """Test that creating a review requires authentication."""
    professional = create_sample_professional(db)

    r = client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 5, "comment": "Great lawyer!"},
    )

    assert r.status_code in (401, 403)


def test_create_review_with_auth(client: TestClient, db: Session) -> None:
    """Test creating a review with authentication."""
    headers, _ = get_auth_headers(client, db)
    professional = create_sample_professional(db)

    r = client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 5, "comment": "Excellent service!"},
        headers=headers,
    )

    assert r.status_code == 201
    data = r.json()
    assert data["rating"] == 5
    assert data["comment"] == "Excellent service!"
    assert data["professional_id"] == str(professional.id)


def test_create_review_updates_average_rating(client: TestClient, db: Session) -> None:
    """Test that creating a review updates the professional's average rating."""
    professional = create_sample_professional(db)

    # First review: rating 4
    headers1, _ = get_auth_headers(client, db)
    client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 4},
        headers=headers1,
    )

    # Second review: rating 2
    headers2, _ = get_auth_headers(client, db)
    client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 2},
        headers=headers2,
    )

    # Check average
    r = client.get(f"{settings.API_V1_STR}/professionals/{professional.id}")
    assert r.status_code == 200
    data = r.json()
    assert data["average_rating"] == 3.0
    assert data["review_count"] == 2


def test_duplicate_review_returns_400(client: TestClient, db: Session) -> None:
    """Test that submitting a duplicate review returns 400."""
    headers, _ = get_auth_headers(client, db)
    professional = create_sample_professional(db)

    # First review
    r1 = client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 5, "comment": "Great!"},
        headers=headers,
    )
    assert r1.status_code == 201

    # Duplicate review
    r2 = client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 3, "comment": "Changed my mind"},
        headers=headers,
    )
    assert r2.status_code == 400


def test_create_review_invalid_rating(client: TestClient, db: Session) -> None:
    """Test that invalid rating values are rejected."""
    headers, _ = get_auth_headers(client, db)
    professional = create_sample_professional(db)

    # Rating too high
    r = client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 6},
        headers=headers,
    )
    assert r.status_code == 422

    # Rating too low
    r = client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 0},
        headers=headers,
    )
    assert r.status_code == 422


def test_create_review_for_nonexistent_professional(
    client: TestClient, db: Session
) -> None:
    """Test 404 when reviewing a non-existent professional."""
    headers, _ = get_auth_headers(client, db)
    fake_id = uuid.uuid4()

    r = client.post(
        f"{settings.API_V1_STR}/professionals/{fake_id}/reviews",
        json={"rating": 5},
        headers=headers,
    )
    assert r.status_code == 404


def test_review_response_does_not_expose_user_id(
    client: TestClient, db: Session
) -> None:
    """Test that review responses do not include user_id."""
    headers, _ = get_auth_headers(client, db)
    professional = create_sample_professional(db)

    r = client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 4, "comment": "Good"},
        headers=headers,
    )

    assert r.status_code == 201
    data = r.json()
    assert "user_id" not in data


def test_get_filter_options(client: TestClient, db: Session) -> None:
    """Test GET /professionals/filters returns cities and languages."""
    create_sample_professional(db, city="Munich")
    # Default languages is "German, English"

    r = client.get(f"{settings.API_V1_STR}/professionals/filters")

    assert r.status_code == 200
    data = r.json()
    assert "cities" in data
    assert "languages" in data
    assert "Munich" in data["cities"]
    assert "German" in data["languages"]
    assert "English" in data["languages"]


def test_language_filter_escapes_wildcards(client: TestClient, db: Session) -> None:
    """Test that SQL wildcards in language filter are escaped properly."""
    create_sample_professional(db)

    # A percent sign should not act as a wildcard
    r = client.get(
        f"{settings.API_V1_STR}/professionals/",
        params={"language": "%"},
    )

    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 0
