"""Tests for Journey API endpoints."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate
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
    """Helper to create a journey."""
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


def test_create_journey(client: TestClient, db: Session) -> None:
    """Test creating a new journey."""
    headers, _ = get_auth_headers(client, db)

    journey_data = {
        "title": "My Berlin Apartment Journey",
        "questionnaire": {
            "property_type": "apartment",
            "property_location": "Berlin",
            "financing_type": "mortgage",
            "is_first_time_buyer": True,
            "has_german_residency": True,
            "budget_euros": 350000,
            "target_purchase_date": "2026-12-31T00:00:00Z",
        },
    }

    r = client.post(
        f"{settings.API_V1_STR}/journeys/",
        headers=headers,
        json=journey_data,
    )

    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "My Berlin Apartment Journey"
    assert data["property_type"] == "apartment"
    assert data["property_location"] == "Berlin"
    assert data["financing_type"] == "mortgage"
    assert data["is_first_time_buyer"] is True
    assert data["budget_euros"] == 350000
    assert len(data["steps"]) > 0
    assert data["current_step_number"] == 1
    assert data["current_phase"] == "research"


def test_create_journey_unauthenticated(client: TestClient) -> None:
    """Test that unauthenticated users cannot create journeys."""
    journey_data = {
        "title": "Test Journey",
        "questionnaire": {
            "property_type": "apartment",
            "property_location": "Berlin",
            "financing_type": "cash",
            "is_first_time_buyer": True,
            "has_german_residency": True,
        },
    }

    r = client.post(f"{settings.API_V1_STR}/journeys/", json=journey_data)
    assert r.status_code == 401


def test_create_journey_cash_buyer_excludes_mortgage_steps(
    client: TestClient, db: Session
) -> None:
    """Test that cash buyers don't get mortgage-related steps."""
    headers, _ = get_auth_headers(client, db)

    journey_data = {
        "title": "Cash Purchase Journey",
        "questionnaire": {
            "property_type": "house",
            "property_location": "Munich",
            "financing_type": "cash",
            "is_first_time_buyer": False,
            "has_german_residency": True,
            "budget_euros": 500000,
        },
    }

    r = client.post(
        f"{settings.API_V1_STR}/journeys/",
        headers=headers,
        json=journey_data,
    )

    assert r.status_code == 201
    data = r.json()

    # Check that no mortgage-related steps are included
    step_titles = [step["title"] for step in data["steps"]]
    assert "Get Mortgage Pre-Approval" not in step_titles


def test_list_journeys(client: TestClient, db: Session) -> None:
    """Test listing user's journeys."""
    headers, _ = get_auth_headers(client, db)

    # Create a journey first
    create_journey(client, headers)

    r = client.get(f"{settings.API_V1_STR}/journeys/", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["count"] >= 1
    assert len(data["data"]) >= 1


def test_get_journey_details(client: TestClient, db: Session) -> None:
    """Test getting journey with full details."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["id"] == journey_id
    assert len(data["steps"]) > 0
    # Each step should have tasks
    first_step = data["steps"][0]
    assert "tasks" in first_step
    assert len(first_step["tasks"]) > 0


def test_get_journey_not_found(client: TestClient, db: Session) -> None:
    """Test getting non-existent journey."""
    headers, _ = get_auth_headers(client, db)
    fake_id = str(uuid.uuid4())

    r = client.get(f"{settings.API_V1_STR}/journeys/{fake_id}", headers=headers)

    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


def test_get_journey_progress(client: TestClient, db: Session) -> None:
    """Test getting journey progress."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    r = client.get(
        f"{settings.API_V1_STR}/journeys/{journey_id}/progress",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["journey_id"] == journey_id
    assert data["total_steps"] > 0
    assert data["completed_steps"] == 0
    assert data["progress_percentage"] == 0
    assert "phases" in data
    assert "research" in data["phases"]


def test_get_next_step(client: TestClient, db: Session) -> None:
    """Test getting next recommended step."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    r = client.get(
        f"{settings.API_V1_STR}/journeys/{journey_id}/next-step",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["has_next"] is True
    assert data["step"] is not None
    assert data["step"]["step_number"] == 1
    assert "tasks" in data["step"]


def test_update_step_status(client: TestClient, db: Session) -> None:
    """Test updating step status."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    # Get journey details to get step ID
    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    first_step_id = r.json()["steps"][0]["id"]

    # Update to in_progress
    r = client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/steps/{first_step_id}",
        headers=headers,
        json={"status": "in_progress"},
    )

    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "in_progress"
    assert data["started_at"] is not None


def test_update_step_to_completed(client: TestClient, db: Session) -> None:
    """Test completing a step."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    # Get journey details to get step ID
    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    first_step_id = r.json()["steps"][0]["id"]

    # Complete the step
    r = client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/steps/{first_step_id}",
        headers=headers,
        json={"status": "completed"},
    )

    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "completed"
    assert data["completed_at"] is not None


def test_update_task_status(client: TestClient, db: Session) -> None:
    """Test updating task completion status."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    # Get journey details
    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    journey_data = r.json()
    first_step_id = journey_data["steps"][0]["id"]
    first_task_id = journey_data["steps"][0]["tasks"][0]["id"]

    # Mark task as completed
    r = client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/steps/{first_step_id}/tasks/{first_task_id}",
        headers=headers,
        json={"is_completed": True},
    )

    assert r.status_code == 200
    data = r.json()
    assert data["is_completed"] is True
    assert data["completed_at"] is not None


def test_update_journey_metadata(client: TestClient, db: Session) -> None:
    """Test updating journey title and target date."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    r = client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}",
        headers=headers,
        json={
            "title": "Updated Journey Title",
            "target_purchase_date": "2027-06-30T00:00:00Z",
        },
    )

    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Updated Journey Title"


def test_delete_journey(client: TestClient, db: Session) -> None:
    """Test soft deleting a journey."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    r = client.delete(
        f"{settings.API_V1_STR}/journeys/{journey_id}",
        headers=headers,
    )

    assert r.status_code == 204

    # Journey should not appear in active list
    r = client.get(f"{settings.API_V1_STR}/journeys/", headers=headers)
    journey_ids = [j["id"] for j in r.json()["data"]]
    assert journey_id not in journey_ids


def test_cannot_access_other_users_journey(client: TestClient, db: Session) -> None:
    """Test that users cannot access other users' journeys."""
    # Create journey as user 1
    headers1, _ = get_auth_headers(client, db)
    journey = create_journey(client, headers1)
    journey_id = journey["id"]

    # Try to access as user 2
    headers2, _ = get_auth_headers(client, db)
    r = client.get(
        f"{settings.API_V1_STR}/journeys/{journey_id}",
        headers=headers2,
    )

    assert r.status_code == 404


def test_journey_with_non_resident_includes_document_prep(
    client: TestClient, db: Session
) -> None:
    """Test that non-residents get document preparation step."""
    headers, _ = get_auth_headers(client, db)

    journey_data = {
        "title": "Non-Resident Journey",
        "questionnaire": {
            "property_type": "apartment",
            "property_location": "Frankfurt",
            "financing_type": "mortgage",
            "is_first_time_buyer": True,
            "has_german_residency": False,
            "budget_euros": 400000,
        },
    }

    r = client.post(
        f"{settings.API_V1_STR}/journeys/",
        headers=headers,
        json=journey_data,
    )

    assert r.status_code == 201
    data = r.json()

    # Check that document preparation step is included
    step_titles = [step["title"] for step in data["steps"]]
    assert "Prepare Required Documents" in step_titles


def test_update_property_goals_first_save(client: TestClient, db: Session) -> None:
    """Test saving property goals for the first time (property_goals starts as null)."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    goals_data = {
        "preferred_property_type": "apartment",
        "min_rooms": 3,
        "min_bathrooms": 1,
        "preferred_floor": "middle",
        "has_elevator_required": False,
        "features": ["balcony", "parking"],
        "additional_notes": "Near schools",
        "is_completed": True,
    }

    r = client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/property-goals",
        headers=headers,
        json=goals_data,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["preferred_property_type"] == "apartment"
    assert data["min_rooms"] == 3
    assert data["features"] == ["balcony", "parking"]
    assert data["is_completed"] is True

    # Verify data persists via GET
    r = client.get(
        f"{settings.API_V1_STR}/journeys/{journey_id}/property-goals",
        headers=headers,
    )
    assert r.status_code == 200
    persisted = r.json()
    assert persisted["preferred_property_type"] == "apartment"
    assert persisted["min_rooms"] == 3
    assert persisted["features"] == ["balcony", "parking"]


def test_update_property_goals_second_save_persists(
    client: TestClient, db: Session
) -> None:
    """Regression test: second PATCH to property-goals must persist the new values.

    This catches the SQLAlchemy JSONB mutation bug where re-assigning the same
    dict object causes no change to be detected and the UPDATE is skipped.
    """
    headers, _ = get_auth_headers(client, db)
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    # First save
    r = client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/property-goals",
        headers=headers,
        json={
            "preferred_property_type": "apartment",
            "min_rooms": 2,
            "is_completed": False,
        },
    )
    assert r.status_code == 200

    # Second save with different values
    r = client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/property-goals",
        headers=headers,
        json={
            "preferred_property_type": "house",
            "min_rooms": 4,
            "features": ["garden", "parking"],
            "is_completed": True,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["preferred_property_type"] == "house"
    assert data["min_rooms"] == 4
    assert data["features"] == ["garden", "parking"]
    assert data["is_completed"] is True

    # Re-fetch via GET to confirm DB was updated (not just in-memory response)
    r = client.get(
        f"{settings.API_V1_STR}/journeys/{journey_id}/property-goals",
        headers=headers,
    )
    assert r.status_code == 200
    persisted = r.json()
    assert persisted["preferred_property_type"] == "house", (
        "Second save did not persist: property_goals not updated in DB"
    )
    assert persisted["min_rooms"] == 4
    assert persisted["features"] == ["garden", "parking"]
    assert persisted["is_completed"] is True

    # Also verify the journey detail endpoint returns updated goals
    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    assert r.status_code == 200
    journey_goals = r.json()["property_goals"]
    assert journey_goals is not None
    assert journey_goals["preferred_property_type"] == "house"


def create_journey_with_state_location(
    client: TestClient, headers: dict[str, str]
) -> dict:
    """Helper to create a journey with a valid German state code as location.

    Uses "BE" (Berlin) so that market insight generation can look up static data.
    """
    journey_data = {
        "title": "Berlin Property Journey",
        "questionnaire": {
            "property_type": "apartment",
            "property_location": "BE",
            "financing_type": "mortgage",
            "is_first_time_buyer": True,
            "has_german_residency": True,
            "budget_euros": 400000,
        },
    }
    r = client.post(
        f"{settings.API_V1_STR}/journeys/",
        headers=headers,
        json=journey_data,
    )
    return r.json()


def test_completing_property_goals_generates_market_insights(
    client: TestClient, db: Session
) -> None:
    """Market insights are generated when property goals are completed for the first time."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey_with_state_location(client, headers)
    journey_id = journey["id"]

    # Confirm no insights exist yet
    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    assert r.json()["market_insights"] is None

    # Complete Step 1 property goals
    r = client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/property-goals",
        headers=headers,
        json={
            "preferred_property_type": "apartment",
            "min_rooms": 2,
            "is_completed": True,
        },
    )
    assert r.status_code == 200

    # Verify insights were generated and attached to journey
    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    assert r.status_code == 200
    data = r.json()
    insights = data["market_insights"]
    assert insights is not None
    assert insights["state_code"] == "BE"
    assert insights["state_name"] == "Berlin"
    assert insights["property_type"] == "apartment"
    assert insights["trend"] == "rising"
    assert "generated_at" in insights
    assert insights["estimated_size_sqm"] is not None  # budget was provided


def test_market_insights_not_regenerated_if_already_exists(
    client: TestClient, db: Session
) -> None:
    """Re-saving property goals does not overwrite previously generated insights."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey_with_state_location(client, headers)
    journey_id = journey["id"]

    # First completion: generates insights
    client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/property-goals",
        headers=headers,
        json={"preferred_property_type": "apartment", "is_completed": True},
    )
    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    first_generated_at = r.json()["market_insights"]["generated_at"]

    # Second completion: insights must NOT be overwritten
    client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/property-goals",
        headers=headers,
        json={"preferred_property_type": "house", "is_completed": True},
    )
    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    second_generated_at = r.json()["market_insights"]["generated_at"]

    assert first_generated_at == second_generated_at, (
        "market_insights was regenerated on a second save; it should be preserved"
    )


def test_incomplete_goals_do_not_generate_insights(
    client: TestClient, db: Session
) -> None:
    """Saving property goals without is_completed=True must not generate insights."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey_with_state_location(client, headers)
    journey_id = journey["id"]

    client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/property-goals",
        headers=headers,
        json={"preferred_property_type": "apartment", "is_completed": False},
    )

    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    assert r.json()["market_insights"] is None


def test_goals_property_type_used_in_insights(
    client: TestClient, db: Session
) -> None:
    """Insights use the property type set in goals, not the journey-level type."""
    headers, _ = get_auth_headers(client, db)
    journey = create_journey_with_state_location(client, headers)
    journey_id = journey["id"]

    # Journey property_type is "apartment"; override in goals with "house"
    client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/property-goals",
        headers=headers,
        json={
            "preferred_property_type": "house",
            "is_completed": True,
        },
    )

    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    insights = r.json()["market_insights"]
    assert insights["property_type"] == "house"
    assert insights["type_multiplier"] == 1.3


def test_unknown_location_skips_insight_generation(
    client: TestClient, db: Session
) -> None:
    """When property_location is a city name (not a state code), no insights are set."""
    headers, _ = get_auth_headers(client, db)
    # Use the default create_journey helper which sends "Berlin" (city, not state code)
    journey = create_journey(client, headers)
    journey_id = journey["id"]

    client.patch(
        f"{settings.API_V1_STR}/journeys/{journey_id}/property-goals",
        headers=headers,
        json={"preferred_property_type": "apartment", "is_completed": True},
    )

    r = client.get(f"{settings.API_V1_STR}/journeys/{journey_id}", headers=headers)
    # "Berlin" is not a recognised state code → insights should remain None
    assert r.json()["market_insights"] is None
