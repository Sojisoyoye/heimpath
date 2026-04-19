"""Tests for Portfolio API endpoints."""

import uuid
from datetime import date

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate
from app.models.portfolio import (
    CostCategory,
    PortfolioProperty,
    PortfolioTransaction,
    TransactionType,
)
from tests.utils.utils import random_email, random_lower_string


def get_auth_headers(
    client: TestClient, db: Session
) -> tuple[dict[str, str], uuid.UUID]:
    """Create a user and return auth headers and user id."""
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    return headers, user.id


def create_sample_property(
    db: Session, user_id: uuid.UUID, **overrides
) -> PortfolioProperty:
    """Create a sample portfolio property for testing."""
    prop = PortfolioProperty(
        id=uuid.uuid4(),
        user_id=user_id,
        address=overrides.get("address", "Musterstr. 1"),
        city=overrides.get("city", "Berlin"),
        postcode=overrides.get("postcode", "10115"),
        purchase_price=overrides.get("purchase_price", 300000.0),
        square_meters=overrides.get("square_meters", 75.0),
        is_vacant=overrides.get("is_vacant", False),
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


def create_sample_transaction(
    db: Session, property_id: uuid.UUID, user_id: uuid.UUID, **overrides
) -> PortfolioTransaction:
    """Create a sample portfolio transaction for testing."""
    txn = PortfolioTransaction(
        id=uuid.uuid4(),
        property_id=property_id,
        user_id=user_id,
        type=overrides.get("type", TransactionType.RENT_INCOME.value),
        amount=overrides.get("amount", 1200.0),
        date=overrides.get("date", date.today()),
        is_recurring=overrides.get("is_recurring", False),
        cost_category=overrides.get("cost_category"),
        estimated_amount=overrides.get("estimated_amount"),
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


# ---------------------------------------------------------------------------
# Property endpoints
# ---------------------------------------------------------------------------


def test_create_property(client: TestClient, db: Session) -> None:
    """Test creating a portfolio property returns 201."""
    headers, _ = get_auth_headers(client, db)

    r = client.post(
        f"{settings.API_V1_STR}/portfolio/properties",
        json={
            "address": "Hauptstr. 42",
            "city": "Munich",
            "postcode": "80331",
            "purchase_price": 450000.0,
            "square_meters": 90.0,
        },
        headers=headers,
    )

    assert r.status_code == 201
    data = r.json()
    assert data["address"] == "Hauptstr. 42"
    assert data["city"] == "Munich"
    assert data["purchase_price"] == 450000.0
    assert "id" in data
    assert "created_at" in data


def test_list_properties(client: TestClient, db: Session) -> None:
    """Test listing user properties returns 200."""
    headers, user_id = get_auth_headers(client, db)
    create_sample_property(db, user_id)
    create_sample_property(db, user_id, address="Berliner Str. 5", city="Hamburg")

    r = client.get(
        f"{settings.API_V1_STR}/portfolio/properties",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert "data" in data
    assert "count" in data
    assert data["count"] >= 2


def test_get_property(client: TestClient, db: Session) -> None:
    """Test getting a single property returns 200."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)

    r = client.get(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["id"] == str(prop.id)
    assert data["address"] == "Musterstr. 1"


def test_update_property(client: TestClient, db: Session) -> None:
    """Test partial update of a property returns 200."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)

    r = client.patch(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}",
        json={"city": "Frankfurt", "monthly_rent_target": 1500.0},
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["city"] == "Frankfurt"
    assert data["monthly_rent_target"] == 1500.0


def test_delete_property(client: TestClient, db: Session) -> None:
    """Test deleting a property returns 204."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)

    r = client.delete(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}",
        headers=headers,
    )

    assert r.status_code == 204


def test_get_property_wrong_user_returns_404(client: TestClient, db: Session) -> None:
    """Test accessing another user's property returns 404."""
    _, owner_id = get_auth_headers(client, db)
    prop = create_sample_property(db, owner_id)

    other_headers, _ = get_auth_headers(client, db)

    r = client.get(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}",
        headers=other_headers,
    )

    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Transaction endpoints
# ---------------------------------------------------------------------------


def test_create_transaction(client: TestClient, db: Session) -> None:
    """Test creating a transaction returns 201."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)

    r = client.post(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}/transactions",
        json={
            "type": "rent_income",
            "amount": 1200.0,
            "date": "2026-04-01",
        },
        headers=headers,
    )

    assert r.status_code == 201
    data = r.json()
    assert data["type"] == "rent_income"
    assert data["amount"] == 1200.0
    assert data["property_id"] == str(prop.id)


def test_list_transactions(client: TestClient, db: Session) -> None:
    """Test listing transactions returns 200."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)
    create_sample_transaction(db, prop.id, user_id)
    create_sample_transaction(
        db, prop.id, user_id, type=TransactionType.MAINTENANCE.value, amount=500.0
    )

    r = client.get(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}/transactions",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert "data" in data
    assert "count" in data
    assert data["count"] >= 2


def test_list_transactions_with_date_filter(client: TestClient, db: Session) -> None:
    """Test listing transactions with date range query params."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)
    create_sample_transaction(db, prop.id, user_id, date=date(2026, 1, 15))
    create_sample_transaction(db, prop.id, user_id, date=date(2026, 3, 15))

    r = client.get(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}/transactions",
        params={"date_from": "2026-03-01", "date_to": "2026-04-01"},
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["count"] >= 1


def test_delete_transaction(client: TestClient, db: Session) -> None:
    """Test deleting a transaction returns 204."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)
    txn = create_sample_transaction(db, prop.id, user_id)

    r = client.delete(
        f"{settings.API_V1_STR}/portfolio/transactions/{txn.id}",
        headers=headers,
    )

    assert r.status_code == 204


def test_create_transaction_property_not_found(client: TestClient, db: Session) -> None:
    """Test creating a transaction for non-existent property returns 404."""
    headers, _ = get_auth_headers(client, db)

    r = client.post(
        f"{settings.API_V1_STR}/portfolio/properties/{uuid.uuid4()}/transactions",
        json={
            "type": "rent_income",
            "amount": 1000.0,
            "date": "2026-04-01",
        },
        headers=headers,
    )

    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Cost category transactions
# ---------------------------------------------------------------------------


def test_create_transaction_with_cost_category(client: TestClient, db: Session) -> None:
    """Test creating a transaction with cost_category and estimated_amount."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)

    r = client.post(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}/transactions",
        json={
            "type": "hausgeld",
            "amount": 350.0,
            "date": "2026-04-01",
            "cost_category": "hausgeld",
            "estimated_amount": 280.0,
        },
        headers=headers,
    )

    assert r.status_code == 201
    data = r.json()
    assert data["cost_category"] == "hausgeld"
    assert data["estimated_amount"] == 280.0


def test_create_transaction_without_cost_category(
    client: TestClient, db: Session
) -> None:
    """Test backward compatibility — null cost_category fields."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)

    r = client.post(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}/transactions",
        json={
            "type": "rent_income",
            "amount": 1200.0,
            "date": "2026-04-01",
        },
        headers=headers,
    )

    assert r.status_code == 201
    data = r.json()
    assert data["cost_category"] is None
    assert data["estimated_amount"] is None


# ---------------------------------------------------------------------------
# Cost Summary endpoint
# ---------------------------------------------------------------------------


def test_get_cost_summary(client: TestClient, db: Session) -> None:
    """Test cost summary with 3 categories returns correct structure."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)

    create_sample_transaction(
        db,
        prop.id,
        user_id,
        type=TransactionType.HAUSGELD.value,
        amount=350.0,
        cost_category=CostCategory.HAUSGELD.value,
        estimated_amount=300.0,
    )
    create_sample_transaction(
        db,
        prop.id,
        user_id,
        type=TransactionType.INSURANCE.value,
        amount=100.0,
        cost_category=CostCategory.INSURANCE.value,
        estimated_amount=90.0,
    )
    create_sample_transaction(
        db,
        prop.id,
        user_id,
        type=TransactionType.TAX_PAYMENT.value,
        amount=200.0,
        cost_category=CostCategory.GRUNDSTEUER.value,
        estimated_amount=180.0,
    )

    r = client.get(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}/cost-summary",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert len(data["categories"]) == 3
    assert data["total_actual"] == 650.0
    assert data["total_estimated"] == 570.0
    assert data["highest_category"] is not None
    assert isinstance(data["alert_categories"], list)


def test_cost_summary_with_date_filter(client: TestClient, db: Session) -> None:
    """Test cost summary respects date range filtering."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)

    create_sample_transaction(
        db,
        prop.id,
        user_id,
        type=TransactionType.HAUSGELD.value,
        amount=350.0,
        cost_category=CostCategory.HAUSGELD.value,
        date=date(2026, 1, 15),
    )
    create_sample_transaction(
        db,
        prop.id,
        user_id,
        type=TransactionType.HAUSGELD.value,
        amount=400.0,
        cost_category=CostCategory.HAUSGELD.value,
        date=date(2026, 3, 15),
    )

    r = client.get(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}/cost-summary",
        params={"date_from": "2026-03-01", "date_to": "2026-04-01"},
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["total_actual"] == 400.0


def test_cost_summary_alert_threshold(client: TestClient, db: Session) -> None:
    """Test that actual >20% over estimated triggers alert."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)

    create_sample_transaction(
        db,
        prop.id,
        user_id,
        type=TransactionType.OPERATING_EXPENSE.value,
        amount=500.0,
        cost_category=CostCategory.HEATING.value,
        estimated_amount=200.0,  # 150% over → alert
    )

    r = client.get(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}/cost-summary",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert "heating" in data["alert_categories"]
    assert data["categories"][0]["is_over_threshold"] is True


def test_cost_summary_empty(client: TestClient, db: Session) -> None:
    """Test cost summary with no cost-category transactions returns empty."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id)
    # Add a transaction WITHOUT cost_category
    create_sample_transaction(db, prop.id, user_id)

    r = client.get(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}/cost-summary",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert data["categories"] == []
    assert data["total_actual"] == 0.0
    assert data["alert_categories"] == []


def test_cost_summary_wrong_user_404(client: TestClient, db: Session) -> None:
    """Test cost summary for another user's property returns 404."""
    _, owner_id = get_auth_headers(client, db)
    prop = create_sample_property(db, owner_id)

    other_headers, _ = get_auth_headers(client, db)

    r = client.get(
        f"{settings.API_V1_STR}/portfolio/properties/{prop.id}/cost-summary",
        headers=other_headers,
    )

    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Summary endpoint
# ---------------------------------------------------------------------------


def test_get_portfolio_summary(client: TestClient, db: Session) -> None:
    """Test portfolio summary returns 200 with correct structure."""
    headers, user_id = get_auth_headers(client, db)
    prop = create_sample_property(db, user_id, purchase_price=300000.0)
    create_sample_transaction(
        db, prop.id, user_id, type=TransactionType.RENT_INCOME.value, amount=1200.0
    )

    r = client.get(
        f"{settings.API_V1_STR}/portfolio/summary",
        headers=headers,
    )

    assert r.status_code == 200
    data = r.json()
    assert "total_properties" in data
    assert "total_purchase_value" in data
    assert "total_current_value" in data
    assert "total_income" in data
    assert "total_expenses" in data
    assert "net_cash_flow" in data
    assert "vacancy_rate" in data
    assert "average_gross_yield" in data
    assert data["total_properties"] >= 1


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


def test_unauthenticated_returns_error(client: TestClient) -> None:
    """Test that unauthenticated requests are rejected."""
    r = client.get(f"{settings.API_V1_STR}/portfolio/properties")
    assert r.status_code in (401, 403)
