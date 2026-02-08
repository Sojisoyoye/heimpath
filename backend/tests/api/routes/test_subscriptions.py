"""Tests for Subscription API endpoints."""
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import SubscriptionTier, UserCreate
from app.services.payment_service import (
    CheckoutSessionResult,
    PortalSessionResult,
    WebhookVerificationError,
)
from tests.utils.utils import random_email, random_lower_string


def test_get_current_subscription_free_user(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test getting subscription status for free tier user."""
    r = client.get(
        f"{settings.API_V1_STR}/subscriptions/current",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["tier"] == "free"
    assert data["status"] is None


def test_get_current_subscription_unauthenticated(client: TestClient) -> None:
    """Test that unauthenticated users cannot get subscription status."""
    r = client.get(f"{settings.API_V1_STR}/subscriptions/current")
    assert r.status_code == 401


def test_create_checkout_session_stripe_not_configured(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test checkout fails when Stripe is not configured."""
    with patch("app.api.routes.subscriptions.get_payment_service", return_value=None):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/checkout",
            headers=normal_user_token_headers,
            json={
                "tier": "premium",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel",
            },
        )
        assert r.status_code == 503
        assert "not configured" in r.json()["detail"]


def test_create_checkout_session_for_free_tier_fails(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test checkout for free tier returns error."""
    mock_service = MagicMock()

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/checkout",
            headers=normal_user_token_headers,
            json={
                "tier": "free",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel",
            },
        )
        assert r.status_code == 400
        assert "Cannot checkout for free tier" in r.json()["detail"]


def test_create_checkout_session_success(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test successful checkout session creation."""
    mock_service = MagicMock()
    # Use AsyncMock for async method
    mock_service.create_checkout_session = AsyncMock(
        return_value=CheckoutSessionResult(
            session_id="cs_test_123",
            url="https://checkout.stripe.com/test",
        )
    )

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/checkout",
            headers=normal_user_token_headers,
            json={
                "tier": "premium",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel",
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["session_id"] == "cs_test_123"
        assert data["url"] == "https://checkout.stripe.com/test"


def test_create_portal_session_no_subscription(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test portal session fails for user without subscription."""
    mock_service = MagicMock()

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/portal",
            headers=normal_user_token_headers,
            json={"return_url": "https://example.com/account"},
        )
        assert r.status_code == 400
        assert "No active subscription" in r.json()["detail"]


def test_cancel_subscription_no_active_subscription(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test cancellation fails when user has no active subscription."""
    mock_service = MagicMock()

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/cancel",
            headers=normal_user_token_headers,
        )
        assert r.status_code == 400
        assert "No active subscription" in r.json()["detail"]


def test_cancel_subscription_success(client: TestClient, db: Session) -> None:
    """Test successful subscription cancellation."""
    # Create a user with premium subscription
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    user.subscription_tier = SubscriptionTier.PREMIUM
    db.add(user)
    db.commit()
    db.refresh(user)

    # Login
    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    mock_service = MagicMock()

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/cancel",
            headers=headers,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["tier"] == "free"
        assert data["status"] == "cancelled"

    # Verify user tier was updated
    db.refresh(user)
    assert user.subscription_tier == SubscriptionTier.FREE


def test_webhook_stripe_not_configured(client: TestClient) -> None:
    """Test webhook returns error when Stripe is not configured."""
    with patch("app.api.routes.subscriptions.get_payment_service", return_value=None):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/webhook",
            content=b"{}",
            headers={"Stripe-Signature": "test_sig"},
        )
        assert r.status_code == 503


def test_webhook_invalid_signature(client: TestClient) -> None:
    """Test webhook returns error for invalid signature."""
    mock_service = MagicMock()
    mock_service.verify_webhook_signature.side_effect = WebhookVerificationError(
        "Invalid signature"
    )

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/webhook",
            content=b"{}",
            headers={"Stripe-Signature": "bad_sig"},
        )
        assert r.status_code == 400
        assert "Invalid signature" in r.json()["detail"]


def test_get_current_subscription_premium_user(
    client: TestClient, db: Session
) -> None:
    """Test getting subscription status for premium tier user."""
    # Create a user with premium subscription
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    user.subscription_tier = SubscriptionTier.PREMIUM
    db.add(user)
    db.commit()

    # Login
    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    r = client.get(
        f"{settings.API_V1_STR}/subscriptions/current",
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["tier"] == "premium"
    assert data["status"] == "active"


def test_checkout_already_subscribed_to_same_tier(
    client: TestClient, db: Session
) -> None:
    """Test checkout fails when already subscribed to same tier."""
    # Create a user with premium subscription
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    user.subscription_tier = SubscriptionTier.PREMIUM
    db.add(user)
    db.commit()

    # Login
    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    mock_service = MagicMock()

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/checkout",
            headers=headers,
            json={
                "tier": "premium",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel",
            },
        )
        assert r.status_code == 400
        assert "Already subscribed" in r.json()["detail"]
