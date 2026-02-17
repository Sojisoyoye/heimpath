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

    assert r.status_code == 200
    assert "deleted" in r.json()["message"].lower()

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
