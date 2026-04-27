"""Tests for Subscription API endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import SubscriptionTier, UserCreate
from app.services.payment_service import (
    CheckoutSessionResult,
    WebhookEventType,
    WebhookVerificationError,
)
from tests.utils.utils import random_email, random_lower_string

# ── Helpers ───────────────────────────────────────────────────────────────────


def _create_premium_user_with_stripe(
    db: Session,
    customer_id: str = "",
    subscription_id: str = "",
) -> tuple:
    """Create a PREMIUM user with Stripe IDs; return (user, username, password)."""
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    user.subscription_tier = SubscriptionTier.PREMIUM
    user.stripe_customer_id = customer_id or f"cus_{random_lower_string()[:8]}"
    user.stripe_subscription_id = subscription_id or f"sub_{random_lower_string()[:8]}"
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, username, password


def _login_headers(client: TestClient, username: str, password: str) -> dict:
    r = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": username, "password": password},
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


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
    """Cancel schedules via Stripe; DB tier stays until webhook fires."""
    user, username, password = _create_premium_user_with_stripe(db)
    headers = _login_headers(client, username, password)

    mock_service = MagicMock()
    mock_service.cancel_subscription = AsyncMock(return_value=None)

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/cancel",
            headers=headers,
        )
        assert r.status_code == 200
        data = r.json()
        # Tier stays PREMIUM until SUBSCRIPTION_DELETED webhook fires
        assert data["tier"] == "premium"
        assert data["status"] == "cancellation_scheduled"
        mock_service.cancel_subscription.assert_called_once_with(
            user.stripe_subscription_id, at_period_end=True
        )

    # DB tier must NOT be downgraded immediately
    db.refresh(user)
    assert user.subscription_tier == SubscriptionTier.PREMIUM


def test_cancel_subscription_no_stripe_subscription_id(
    client: TestClient, db: Session
) -> None:
    """Cancel returns 400 when stripe_subscription_id is missing."""
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    user.subscription_tier = SubscriptionTier.PREMIUM
    # Deliberately no stripe_subscription_id
    db.add(user)
    db.commit()
    headers = _login_headers(client, username, password)

    mock_service = MagicMock()

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/cancel",
            headers=headers,
        )
        assert r.status_code == 400
        assert "No Stripe subscription found" in r.json()["detail"]


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


def test_get_current_subscription_premium_user(client: TestClient, db: Session) -> None:
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


# ── Webhook: M1 — tier derived from price_id ──────────────────────────────────


def _make_webhook_event(
    event_type: str, data_object: dict, metadata: dict
) -> MagicMock:
    """Build a MagicMock that quacks like a stripe.Event for webhook tests."""
    from app.services.payment_service import WebhookEvent

    raw_event: MagicMock = MagicMock()
    raw_event.__getitem__ = MagicMock(
        side_effect=lambda k: {"data": {"object": data_object}}.get(k, MagicMock())
    )

    parsed = WebhookEvent(
        event_type=event_type,
        customer_id=data_object.get("customer"),
        subscription_id=data_object.get("subscription"),
        price_id=None,
        status=None,
        metadata=metadata,
    )
    return raw_event, parsed


def test_webhook_checkout_derives_tier_from_price_id(
    client: TestClient, db: Session
) -> None:
    """M1: checkout.session.completed uses price_id, not metadata, for tier."""
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    db.commit()

    session_obj = {
        "id": "cs_test",
        "customer": "cus_111",
        "subscription": "sub_111",
    }
    raw_event, parsed_event = _make_webhook_event(
        WebhookEventType.CHECKOUT_COMPLETED.value,
        session_obj,
        {"user_id": str(user.id)},
    )

    mock_service = MagicMock()
    mock_service.verify_webhook_signature.return_value = raw_event
    mock_service.parse_webhook_event.return_value = parsed_event
    # Price lookup returns the premium price — this is the trusted source
    mock_service.get_checkout_price_id.return_value = "price_premium"
    mock_service.get_tier_for_price.return_value = SubscriptionTier.PREMIUM

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/webhook",
            content=b"{}",
            headers={"Stripe-Signature": "sig"},
        )
        assert r.status_code == 200
        assert r.json()["received"] is True

    db.refresh(user)
    assert user.subscription_tier == SubscriptionTier.PREMIUM
    assert user.stripe_customer_id == "cus_111"
    assert user.stripe_subscription_id == "sub_111"
    # Verify tier was derived from price_id, not metadata
    mock_service.get_checkout_price_id.assert_called_once_with("cs_test")
    mock_service.get_tier_for_price.assert_called_once_with("price_premium")


def test_webhook_checkout_unknown_price_logs_warning(
    client: TestClient, db: Session
) -> None:
    """M1: unknown price_id logs a warning and does not change user tier."""
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    db.commit()

    session_obj = {"id": "cs_unknown", "customer": "cus_222", "subscription": "sub_222"}
    raw_event, parsed_event = _make_webhook_event(
        WebhookEventType.CHECKOUT_COMPLETED.value,
        session_obj,
        {"user_id": str(user.id)},
    )

    mock_service = MagicMock()
    mock_service.verify_webhook_signature.return_value = raw_event
    mock_service.parse_webhook_event.return_value = parsed_event
    mock_service.get_checkout_price_id.return_value = "price_unknown"
    # Unknown price → FREE tier (default)
    mock_service.get_tier_for_price.return_value = SubscriptionTier.FREE

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/webhook",
            content=b"{}",
            headers={"Stripe-Signature": "sig"},
        )
        assert r.status_code == 200

    db.refresh(user)
    # Tier must NOT be changed when price resolves to FREE (unknown)
    assert user.subscription_tier == SubscriptionTier.FREE


# ── Webhook: M10 — subscription_deleted downgrades tier ─────────────────────


def test_webhook_subscription_deleted_downgrades_user(
    client: TestClient, db: Session
) -> None:
    """M10: customer.subscription.deleted sets tier=FREE via stripe_customer_id."""
    user, _username, _password = _create_premium_user_with_stripe(db)

    from app.services.payment_service import WebhookEvent

    parsed_event = WebhookEvent(
        event_type=WebhookEventType.SUBSCRIPTION_DELETED.value,
        customer_id=user.stripe_customer_id,
        subscription_id=user.stripe_subscription_id,
        price_id=None,
        status="canceled",
        metadata={},
    )
    raw_event = MagicMock()
    raw_event.__getitem__ = MagicMock(
        side_effect=lambda k: {"data": {"object": {}}}.get(k, MagicMock())
    )

    mock_service = MagicMock()
    mock_service.verify_webhook_signature.return_value = raw_event
    mock_service.parse_webhook_event.return_value = parsed_event

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/webhook",
            content=b"{}",
            headers={"Stripe-Signature": "sig"},
        )
        assert r.status_code == 200

    db.refresh(user)
    assert user.subscription_tier == SubscriptionTier.FREE
    assert user.stripe_subscription_id is None


def test_webhook_subscription_updated_changes_tier(
    client: TestClient, db: Session
) -> None:
    """customer.subscription.updated updates tier via stripe_customer_id."""
    user, _username, _password = _create_premium_user_with_stripe(db)

    from app.services.payment_service import WebhookEvent

    parsed_event = WebhookEvent(
        event_type=WebhookEventType.SUBSCRIPTION_UPDATED.value,
        customer_id=user.stripe_customer_id,
        subscription_id=user.stripe_subscription_id,
        price_id="price_enterprise",
        status="active",
        metadata={},
    )
    raw_event = MagicMock()
    raw_event.__getitem__ = MagicMock(
        side_effect=lambda k: {"data": {"object": {}}}.get(k, MagicMock())
    )

    mock_service = MagicMock()
    mock_service.verify_webhook_signature.return_value = raw_event
    mock_service.parse_webhook_event.return_value = parsed_event
    mock_service.get_tier_for_price.return_value = SubscriptionTier.ENTERPRISE

    with patch(
        "app.api.routes.subscriptions.get_payment_service", return_value=mock_service
    ):
        r = client.post(
            f"{settings.API_V1_STR}/subscriptions/webhook",
            content=b"{}",
            headers={"Stripe-Signature": "sig"},
        )
        assert r.status_code == 200

    db.refresh(user)
    assert user.subscription_tier == SubscriptionTier.ENTERPRISE
