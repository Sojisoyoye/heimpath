"""Tests for Financing Eligibility API endpoints."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate
from tests.utils.utils import random_email, random_lower_string

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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


def _assessment_payload(**overrides) -> dict:
    """Return a valid POST body for a financing assessment."""
    defaults = {
        "name": "Test Assessment",
        "employment_status": "permanent",
        "employment_years": 3,
        "monthly_net_income": 4000.0,
        "monthly_debt": 500.0,
        "available_down_payment": 60000.0,
        "schufa_rating": "good",
        "residency_status": "eu_citizen",
    }
    defaults.update(overrides)
    return defaults


def create_assessment(client: TestClient, headers: dict[str, str]) -> dict:
    """Helper: POST a new assessment and return the response JSON."""
    r = client.post(
        f"{settings.API_V1_STR}/financing/eligibility",
        headers=headers,
        json=_assessment_payload(),
    )
    assert r.status_code == 201, r.text
    return r.json()


# ---------------------------------------------------------------------------
# POST /financing/eligibility
# ---------------------------------------------------------------------------


def test_save_assessment_returns_201(client: TestClient, db: Session) -> None:
    """Authenticated POST returns 201 with full assessment result."""
    headers, _ = get_auth_headers(client, db)

    r = client.post(
        f"{settings.API_V1_STR}/financing/eligibility",
        headers=headers,
        json=_assessment_payload(),
    )

    assert r.status_code == 201
    data = r.json()
    assert "id" in data
    assert data["employment_status"] == "permanent"
    assert data["likelihood_label"] in ("High", "Good", "Moderate", "Low", "Very Low")
    assert data["total_score"] >= 0
    assert data["max_loan_estimate"] > 0
    assert isinstance(data["strengths"], list)
    assert isinstance(data["improvements"], list)
    assert isinstance(data["document_checklist"], list)
    assert len(data["document_checklist"]) >= 6


def test_save_assessment_unauthenticated_returns_401(client: TestClient) -> None:
    """Unauthenticated POST returns 401."""
    r = client.post(
        f"{settings.API_V1_STR}/financing/eligibility",
        json=_assessment_payload(),
    )
    assert r.status_code == 401


def test_save_assessment_strong_profile_scores_high(
    client: TestClient, db: Session
) -> None:
    """Civil servant with excellent profile receives High likelihood."""
    headers, _ = get_auth_headers(client, db)

    r = client.post(
        f"{settings.API_V1_STR}/financing/eligibility",
        headers=headers,
        json=_assessment_payload(
            employment_status="civil_servant",
            employment_years=10,
            monthly_net_income=6000.0,
            monthly_debt=200.0,
            available_down_payment=100000.0,
            schufa_rating="excellent",
            residency_status="german_citizen",
        ),
    )

    assert r.status_code == 201
    data = r.json()
    assert data["total_score"] >= 80
    assert data["likelihood_label"] == "High"


def test_save_assessment_generates_share_id(client: TestClient, db: Session) -> None:
    """Saved assessment always has a share_id."""
    headers, _ = get_auth_headers(client, db)
    data = create_assessment(client, headers)
    assert data["share_id"] is not None
    assert len(data["share_id"]) > 0


# ---------------------------------------------------------------------------
# GET /financing/eligibility
# ---------------------------------------------------------------------------


def test_list_assessments_returns_saved(client: TestClient, db: Session) -> None:
    """List endpoint returns assessments belonging to the authenticated user."""
    headers, _ = get_auth_headers(client, db)
    create_assessment(client, headers)

    r = client.get(
        f"{settings.API_V1_STR}/financing/eligibility",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["count"] >= 1
    assert len(data["data"]) >= 1
    first = data["data"][0]
    assert "id" in first
    assert "total_score" in first
    assert "likelihood_label" in first
    assert "max_loan_estimate" in first


def test_list_assessments_unauthenticated_returns_401(client: TestClient) -> None:
    """Unauthenticated GET list returns 401."""
    r = client.get(f"{settings.API_V1_STR}/financing/eligibility")
    assert r.status_code == 401


def test_list_assessments_isolated_per_user(client: TestClient, db: Session) -> None:
    """User A's assessments are not visible to user B."""
    headers_a, _ = get_auth_headers(client, db)
    headers_b, _ = get_auth_headers(client, db)

    create_assessment(client, headers_a)

    r = client.get(
        f"{settings.API_V1_STR}/financing/eligibility",
        headers=headers_b,
    )

    assert r.status_code == 200
    assert r.json()["count"] == 0


# ---------------------------------------------------------------------------
# GET /financing/eligibility/{assessment_id}
# ---------------------------------------------------------------------------


def test_get_assessment_by_id(client: TestClient, db: Session) -> None:
    """GET by ID returns the full assessment for its owner."""
    headers, _ = get_auth_headers(client, db)
    created = create_assessment(client, headers)
    assessment_id = created["id"]

    r = client.get(
        f"{settings.API_V1_STR}/financing/eligibility/{assessment_id}",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["id"] == assessment_id
    assert data["employment_status"] == "permanent"
    assert isinstance(data["document_checklist"], list)


def test_get_assessment_not_found(client: TestClient, db: Session) -> None:
    """GET with non-existent ID returns 404."""
    headers, _ = get_auth_headers(client, db)
    fake_id = str(uuid.uuid4())

    r = client.get(
        f"{settings.API_V1_STR}/financing/eligibility/{fake_id}",
        headers=headers,
    )

    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


def test_get_assessment_other_user_returns_404(client: TestClient, db: Session) -> None:
    """User B cannot access user A's assessment (ownership enforced)."""
    headers_a, _ = get_auth_headers(client, db)
    headers_b, _ = get_auth_headers(client, db)

    created = create_assessment(client, headers_a)
    assessment_id = created["id"]

    r = client.get(
        f"{settings.API_V1_STR}/financing/eligibility/{assessment_id}",
        headers=headers_b,
    )

    assert r.status_code == 404


def test_get_assessment_unauthenticated_returns_401(client: TestClient) -> None:
    """Unauthenticated GET by ID returns 401."""
    fake_id = str(uuid.uuid4())
    r = client.get(f"{settings.API_V1_STR}/financing/eligibility/{fake_id}")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# GET /financing/eligibility/share/{share_id}
# ---------------------------------------------------------------------------


def test_get_shared_assessment_no_auth_required(
    client: TestClient, db: Session
) -> None:
    """Share endpoint is public — no authentication needed."""
    headers, _ = get_auth_headers(client, db)
    created = create_assessment(client, headers)
    share_id = created["share_id"]

    r = client.get(
        f"{settings.API_V1_STR}/financing/eligibility/share/{share_id}",
    )

    assert r.status_code == 200
    data = r.json()
    assert data["share_id"] == share_id
    assert data["likelihood_label"] in ("High", "Good", "Moderate", "Low", "Very Low")


def test_get_shared_assessment_not_found(client: TestClient) -> None:
    """Share endpoint returns 404 for unknown share_id."""
    r = client.get(
        f"{settings.API_V1_STR}/financing/eligibility/share/nonexistent123",
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /financing/eligibility/{assessment_id}
# ---------------------------------------------------------------------------


def test_delete_assessment_returns_204(client: TestClient, db: Session) -> None:
    """DELETE returns 204 and removes the assessment."""
    headers, _ = get_auth_headers(client, db)
    created = create_assessment(client, headers)
    assessment_id = created["id"]

    r = client.delete(
        f"{settings.API_V1_STR}/financing/eligibility/{assessment_id}",
        headers=headers,
    )
    assert r.status_code == 204

    # Confirm it's gone
    r = client.get(
        f"{settings.API_V1_STR}/financing/eligibility/{assessment_id}",
        headers=headers,
    )
    assert r.status_code == 404


def test_delete_assessment_other_user_returns_404(
    client: TestClient, db: Session
) -> None:
    """User B cannot delete user A's assessment."""
    headers_a, _ = get_auth_headers(client, db)
    headers_b, _ = get_auth_headers(client, db)

    created = create_assessment(client, headers_a)
    assessment_id = created["id"]

    r = client.delete(
        f"{settings.API_V1_STR}/financing/eligibility/{assessment_id}",
        headers=headers_b,
    )
    assert r.status_code == 404


def test_delete_assessment_unauthenticated_returns_401(client: TestClient) -> None:
    """Unauthenticated DELETE returns 401."""
    fake_id = str(uuid.uuid4())
    r = client.delete(f"{settings.API_V1_STR}/financing/eligibility/{fake_id}")
    assert r.status_code == 401
