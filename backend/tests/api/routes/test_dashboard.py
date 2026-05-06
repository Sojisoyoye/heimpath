"""Tests for Dashboard API endpoints."""

import secrets

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate
from app.models.calculator import HiddenCostCalculation
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


def create_journey(client: TestClient, headers: dict[str, str]) -> dict:
    """Helper to create a journey for testing."""
    journey_data = {
        "title": "Test Property Journey",
        "questionnaire": {
            "property_type": "apartment",
            "property_location": "Berlin",
            "financing_type": "mortgage",
            "is_first_time_buyer": True,
            "has_german_residency": True,
            "budget_euros": 300000,
        },
    }
    r = client.post(
        f"{settings.API_V1_STR}/journeys/",
        headers=headers,
        json=journey_data,
    )
    return r.json()


def test_get_dashboard_overview_unauthenticated(client: TestClient) -> None:
    """Test that unauthenticated users cannot access the dashboard."""
    r = client.get(f"{settings.API_V1_STR}/dashboard/")
    assert r.status_code == 401


def test_get_dashboard_overview_new_user(client: TestClient, db: Session) -> None:
    """Test dashboard for a brand new user with no data."""
    headers, _ = get_auth_headers(client, db)

    r = client.get(f"{settings.API_V1_STR}/dashboard/", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["has_journey"] is False
    assert data["journey"] is None
    assert data["recent_documents"] == []
    assert data["recent_calculations"] == []
    assert data["bookmarked_laws"] == []
    assert data["recent_activity"] == []
    assert data["documents_translated_this_month"] == 0
    assert data["total_calculations"] == 0
    assert data["total_bookmarks"] == 0


def test_get_dashboard_overview_with_journey(client: TestClient, db: Session) -> None:
    """Test dashboard for a user who has started a journey."""
    headers, _ = get_auth_headers(client, db)

    # Create a journey
    journey = create_journey(client, headers)

    r = client.get(f"{settings.API_V1_STR}/dashboard/", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["has_journey"] is True
    assert data["journey"] is not None
    assert data["journey"]["id"] == journey["id"]
    assert data["journey"]["title"] == "Test Property Journey"
    assert data["journey"]["current_phase"] == "research"
    assert data["journey"]["total_steps"] > 0
    assert data["journey"]["completed_steps"] == 0
    assert data["journey"]["progress_percentage"] == 0.0
    assert data["journey"]["phases"] is not None
    assert "research" in data["journey"]["phases"]
    assert data["journey"]["next_step_title"] is not None
    assert data["journey"]["next_step_id"] is not None


def test_dashboard_journey_shows_progress_after_step_completion(
    client: TestClient, db: Session
) -> None:
    """Test that dashboard reflects journey progress after completing a step."""
    headers, _ = get_auth_headers(client, db)

    # Create a journey
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    # Get journey details to find step ID
    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    first_step_id = r.json()["steps"][0]["id"]

    # Complete the first step
    client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/steps/{first_step_id}",
        headers=headers,
        json={"status": "completed"},
    )

    # Check dashboard reflects progress
    r = client.get(f"{settings.API_V1_STR}/dashboard/", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["journey"]["completed_steps"] >= 1
    assert data["journey"]["progress_percentage"] > 0

    # Activity timeline should include the step completion
    activity_types = [a["activity_type"] for a in data["recent_activity"]]
    assert "step_completed" in activity_types


def test_dashboard_activity_includes_journey_start(
    client: TestClient, db: Session
) -> None:
    """Test that starting a journey appears in the activity timeline."""
    headers, _ = get_auth_headers(client, db)

    create_journey(client, headers)

    r = client.get(f"{settings.API_V1_STR}/dashboard/", headers=headers)
    assert r.status_code == 200
    data = r.json()

    activity_types = [a["activity_type"] for a in data["recent_activity"]]
    assert "journey_started" in activity_types


def test_dashboard_with_saved_calculation(client: TestClient, db: Session) -> None:
    """Test that saved calculations appear on dashboard."""
    headers, email = get_auth_headers(client, db)

    # Create calculation directly in DB to avoid unrelated schema bug
    user = crud.get_user_by_email(session=db, email=email)
    calc = HiddenCostCalculation(
        user_id=user.id,
        name="Berlin Test Calc",
        share_id=secrets.token_urlsafe(8),
        property_price=300000,
        state_code="BE",
        property_type="apartment",
        include_agent=True,
        renovation_level="none",
        include_moving=True,
        transfer_tax=18000,
        notary_fee=4500,
        land_registry_fee=1500,
        agent_commission=10710,
        renovation_estimate=0,
        moving_costs=1500,
        total_additional_costs=36210,
        total_cost_of_ownership=336210,
        additional_cost_percentage=12.07,
    )
    db.add(calc)
    db.commit()

    r = client.get(f"{settings.API_V1_STR}/dashboard/", headers=headers)
    assert r.status_code == 200
    data = r.json()

    assert data["total_calculations"] >= 1
    assert len(data["recent_calculations"]) >= 1
    assert data["recent_calculations"][0]["calculator_type"] == "hidden_costs"
    assert data["recent_calculations"][0]["name"] == "Berlin Test Calc"

    # Activity should include the calculation
    activity_types = [a["activity_type"] for a in data["recent_activity"]]
    assert "calculation_saved" in activity_types


def test_dashboard_response_structure(client: TestClient, db: Session) -> None:
    """Test that dashboard response has all expected fields."""
    headers, _ = get_auth_headers(client, db)

    r = client.get(f"{settings.API_V1_STR}/dashboard/", headers=headers)
    assert r.status_code == 200
    data = r.json()

    # Verify all top-level fields exist
    expected_fields = [
        "journey",
        "has_journey",
        "recent_documents",
        "recent_calculations",
        "bookmarked_laws",
        "recent_activity",
        "documents_translated_this_month",
        "total_calculations",
        "total_bookmarks",
    ]
    for field in expected_fields:
        assert field in data, f"Missing field: {field}"


def test_dashboard_isolation_between_users(client: TestClient, db: Session) -> None:
    """Test that one user's data does not leak into another user's dashboard."""
    # User 1 creates a journey
    headers1, _ = get_auth_headers(client, db)
    create_journey(client, headers1)

    # User 2 should see an empty dashboard
    headers2, _ = get_auth_headers(client, db)
    r = client.get(f"{settings.API_V1_STR}/dashboard/", headers=headers2)

    assert r.status_code == 200
    data = r.json()
    assert data["has_journey"] is False
    assert data["journey"] is None
    assert data["recent_activity"] == []
