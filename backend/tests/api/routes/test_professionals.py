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


def test_create_review_with_structured_fields(client: TestClient, db: Session) -> None:
    """Test submitting a review with all structured trust signal fields."""
    headers, _ = get_auth_headers(client, db)
    professional = create_sample_professional(db)

    r = client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={
            "rating": 5,
            "comment": "Excellent service!",
            "service_used": "buying",
            "language_used": "English",
            "would_recommend": True,
            "response_time_rating": 4,
        },
        headers=headers,
    )

    assert r.status_code == 201
    data = r.json()
    assert data["rating"] == 5
    assert data["service_used"] == "buying"
    assert data["language_used"] == "English"
    assert data["would_recommend"] is True
    assert data["response_time_rating"] == 4


def test_create_review_structured_fields_optional(
    client: TestClient, db: Session
) -> None:
    """Test that structured fields are optional for backward compatibility."""
    headers, _ = get_auth_headers(client, db)
    professional = create_sample_professional(db)

    r = client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 4},
        headers=headers,
    )

    assert r.status_code == 201
    data = r.json()
    assert data["rating"] == 4
    assert data["service_used"] is None
    assert data["language_used"] is None
    assert data["would_recommend"] is None
    assert data["response_time_rating"] is None


def test_trust_signals_computed_after_review(client: TestClient, db: Session) -> None:
    """Test that recommendation_rate is computed after submitting reviews."""
    professional = create_sample_professional(db)

    # Two recommending users
    for _ in range(2):
        headers, _ = get_auth_headers(client, db)
        client.post(
            f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
            json={"rating": 5, "would_recommend": True},
            headers=headers,
        )

    # One non-recommending user
    headers, _ = get_auth_headers(client, db)
    client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 2, "would_recommend": False},
        headers=headers,
    )

    r = client.get(f"{settings.API_V1_STR}/professionals/{professional.id}")
    assert r.status_code == 200
    data = r.json()
    # 2 out of 3 recommend -> 66.7%
    assert data["recommendation_rate"] is not None
    assert abs(data["recommendation_rate"] - 66.7) < 0.1


def test_list_professionals_sort_by_reviews(client: TestClient, db: Session) -> None:
    """Test sorting professionals by review count."""
    prof1 = create_sample_professional(db, name="Few Reviews Pro")
    prof2 = create_sample_professional(db, name="Many Reviews Pro")

    # Give prof2 more reviews
    for _ in range(3):
        headers, _ = get_auth_headers(client, db)
        client.post(
            f"{settings.API_V1_STR}/professionals/{prof2.id}/reviews",
            json={"rating": 4},
            headers=headers,
        )

    # Give prof1 one review
    headers, _ = get_auth_headers(client, db)
    client.post(
        f"{settings.API_V1_STR}/professionals/{prof1.id}/reviews",
        json={"rating": 5},
        headers=headers,
    )

    r = client.get(
        f"{settings.API_V1_STR}/professionals/",
        params={"sort_by": "reviews", "page_size": 100},
    )
    assert r.status_code == 200
    data = r.json()["data"]
    # First result should have more reviews
    assert data[0]["review_count"] >= data[-1]["review_count"]


def test_list_professionals_sort_by_recommended(
    client: TestClient, db: Session
) -> None:
    """Test sorting professionals by recommendation rate."""
    prof1 = create_sample_professional(db, name="Low Recommend Pro")
    prof2 = create_sample_professional(db, name="High Recommend Pro")

    # prof2: 100% recommendation
    headers, _ = get_auth_headers(client, db)
    client.post(
        f"{settings.API_V1_STR}/professionals/{prof2.id}/reviews",
        json={"rating": 5, "would_recommend": True},
        headers=headers,
    )

    # prof1: 0% recommendation
    headers, _ = get_auth_headers(client, db)
    client.post(
        f"{settings.API_V1_STR}/professionals/{prof1.id}/reviews",
        json={"rating": 2, "would_recommend": False},
        headers=headers,
    )

    r = client.get(
        f"{settings.API_V1_STR}/professionals/",
        params={"sort_by": "recommended", "page_size": 100},
    )
    assert r.status_code == 200
    data = r.json()["data"]

    # Find our two pros in the results
    rec_rates = {item["name"]: item.get("recommendation_rate") for item in data}
    assert rec_rates["High Recommend Pro"] == 100.0
    assert rec_rates["Low Recommend Pro"] == 0.0


def test_review_highlights_computed(client: TestClient, db: Session) -> None:
    """Test that review_highlights JSON is computed after reviews."""
    professional = create_sample_professional(db)

    headers, _ = get_auth_headers(client, db)
    client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={
            "rating": 5,
            "service_used": "buying",
            "response_time_rating": 4,
        },
        headers=headers,
    )

    r = client.get(f"{settings.API_V1_STR}/professionals/{professional.id}")
    assert r.status_code == 200
    data = r.json()
    highlights = data["review_highlights"]
    assert highlights is not None
    assert "top_services" in highlights
    assert "buying" in highlights["top_services"]
    assert highlights["avg_response_time"] == 4.0


def test_invalid_response_time_rating(client: TestClient, db: Session) -> None:
    """Test that response_time_rating outside 1-5 returns 422."""
    headers, _ = get_auth_headers(client, db)
    professional = create_sample_professional(db)

    r = client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 5, "response_time_rating": 6},
        headers=headers,
    )
    assert r.status_code == 422

    r = client.post(
        f"{settings.API_V1_STR}/professionals/{professional.id}/reviews",
        json={"rating": 5, "response_time_rating": 0},
        headers=headers,
    )
    assert r.status_code == 422


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


# ---------------------------------------------------------------------------
# Admin endpoint tests
# ---------------------------------------------------------------------------


def test_create_professional_requires_superuser(
    client: TestClient, db: Session
) -> None:
    """Test that creating a professional requires superuser privileges."""
    headers, _ = get_auth_headers(client, db)

    r = client.post(
        f"{settings.API_V1_STR}/professionals/",
        json={
            "name": "Test Lawyer",
            "type": "lawyer",
            "city": "Berlin",
            "languages": "German",
        },
        headers=headers,
    )

    assert r.status_code == 403


def test_create_professional_as_superuser(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test creating a professional as superuser returns 201 with correct data."""
    r = client.post(
        f"{settings.API_V1_STR}/professionals/",
        json={
            "name": "Notary Weber",
            "type": "notary",
            "city": "Hamburg",
            "languages": "German, English",
            "email": "weber@notary.de",
            "is_verified": True,
        },
        headers=superuser_token_headers,
    )

    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Notary Weber"
    assert data["type"] == "notary"
    assert data["city"] == "Hamburg"
    assert data["is_verified"] is True
    assert "id" in data


def test_update_professional_requires_superuser(
    client: TestClient, db: Session
) -> None:
    """Test that updating a professional requires superuser privileges."""
    professional = create_sample_professional(db)
    headers, _ = get_auth_headers(client, db)

    r = client.put(
        f"{settings.API_V1_STR}/professionals/{professional.id}",
        json={"name": "Updated Name"},
        headers=headers,
    )

    assert r.status_code == 403


def test_update_professional_as_superuser(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    """Test updating a professional as superuser performs partial update."""
    professional = create_sample_professional(db, name="Original Name", city="Berlin")

    r = client.put(
        f"{settings.API_V1_STR}/professionals/{professional.id}",
        json={"name": "Updated Name"},
        headers=superuser_token_headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Updated Name"
    assert data["city"] == "Berlin"


def test_update_professional_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test updating a non-existent professional returns 404."""
    r = client.put(
        f"{settings.API_V1_STR}/professionals/{uuid.uuid4()}",
        json={"name": "Ghost"},
        headers=superuser_token_headers,
    )

    assert r.status_code == 404


def test_delete_professional_requires_superuser(
    client: TestClient, db: Session
) -> None:
    """Test that deleting a professional requires superuser privileges."""
    professional = create_sample_professional(db)
    headers, _ = get_auth_headers(client, db)

    r = client.delete(
        f"{settings.API_V1_STR}/professionals/{professional.id}",
        headers=headers,
    )

    assert r.status_code == 403


def test_delete_professional_as_superuser(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    """Test deleting a professional as superuser returns 204."""
    professional = create_sample_professional(db)

    r = client.delete(
        f"{settings.API_V1_STR}/professionals/{professional.id}",
        headers=superuser_token_headers,
    )

    assert r.status_code == 204


def test_delete_professional_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test deleting a non-existent professional returns 404."""
    r = client.delete(
        f"{settings.API_V1_STR}/professionals/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )

    assert r.status_code == 404


def test_toggle_verify_professional_as_superuser(
    client: TestClient, db: Session, superuser_token_headers: dict[str, str]
) -> None:
    """Test toggling is_verified for a professional as superuser."""
    professional = create_sample_professional(db)
    original_verified = professional.is_verified

    r = client.patch(
        f"{settings.API_V1_STR}/professionals/{professional.id}/verify",
        headers=superuser_token_headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["is_verified"] is not original_verified


def test_toggle_verify_professional_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test toggling verify for a non-existent professional returns 404."""
    r = client.patch(
        f"{settings.API_V1_STR}/professionals/{uuid.uuid4()}/verify",
        headers=superuser_token_headers,
    )

    assert r.status_code == 404
