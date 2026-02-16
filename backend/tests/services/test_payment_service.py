"""Tests for the Payment Service."""

import uuid
from unittest.mock import MagicMock, patch

import pytest
import stripe

from app.models import SubscriptionTier
from app.services.payment_service import (
    CheckoutSessionError,
    CheckoutSessionResult,
    CustomerNotFoundError,
    PaymentError,
    PaymentService,
    PortalSessionResult,
    SubscriptionInfo,
    WebhookEvent,
    WebhookEventType,
    WebhookVerificationError,
)


@pytest.fixture
def payment_service() -> PaymentService:
    """Create a payment service instance for testing."""
    return PaymentService(
        secret_key="sk_test_fake_key",
        webhook_secret="whsec_test_secret",
        premium_price_id="price_premium_123",
        enterprise_price_id="price_enterprise_456",
    )


class TestPaymentServiceInit:
    """Tests for PaymentService initialization."""

    def test_init_sets_stripe_api_key(self) -> None:
        """Test that initialization sets the Stripe API key."""
        _service = PaymentService(secret_key="sk_test_key")
        assert stripe.api_key == "sk_test_key"

    def test_init_builds_price_to_tier_mapping(self) -> None:
        """Test that price to tier mapping is built correctly."""
        service = PaymentService(
            secret_key="sk_test_key",
            premium_price_id="price_premium",
            enterprise_price_id="price_enterprise",
        )
        assert service.get_tier_for_price("price_premium") == SubscriptionTier.PREMIUM
        assert (
            service.get_tier_for_price("price_enterprise")
            == SubscriptionTier.ENTERPRISE
        )
        assert service.get_tier_for_price("unknown") == SubscriptionTier.FREE


class TestGetTierForPrice:
    """Tests for get_tier_for_price method."""

    def test_returns_premium_for_premium_price(
        self, payment_service: PaymentService
    ) -> None:
        """Test premium tier returned for premium price ID."""
        assert (
            payment_service.get_tier_for_price("price_premium_123")
            == SubscriptionTier.PREMIUM
        )

    def test_returns_enterprise_for_enterprise_price(
        self, payment_service: PaymentService
    ) -> None:
        """Test enterprise tier returned for enterprise price ID."""
        assert (
            payment_service.get_tier_for_price("price_enterprise_456")
            == SubscriptionTier.ENTERPRISE
        )

    def test_returns_free_for_unknown_price(
        self, payment_service: PaymentService
    ) -> None:
        """Test free tier returned for unknown price ID."""
        assert (
            payment_service.get_tier_for_price("unknown_price") == SubscriptionTier.FREE
        )


class TestCreateCustomer:
    """Tests for create_customer method."""

    @pytest.mark.asyncio
    async def test_creates_customer_successfully(
        self, payment_service: PaymentService
    ) -> None:
        """Test successful customer creation."""
        user_id = uuid.uuid4()
        mock_customer = MagicMock()
        mock_customer.id = "cus_test123"

        with patch.object(stripe.Customer, "create", return_value=mock_customer):
            result = await payment_service.create_customer(
                user_id=user_id,
                email="test@example.com",
                name="Test User",
            )
            assert result == "cus_test123"

    @pytest.mark.asyncio
    async def test_raises_payment_error_on_stripe_error(
        self, payment_service: PaymentService
    ) -> None:
        """Test PaymentError raised on Stripe API error."""
        with patch.object(
            stripe.Customer,
            "create",
            side_effect=stripe.StripeError("API error"),
        ):
            with pytest.raises(PaymentError) as exc_info:
                await payment_service.create_customer(
                    user_id=uuid.uuid4(),
                    email="test@example.com",
                )
            assert "Failed to create customer" in str(exc_info.value)


class TestCreateCheckoutSession:
    """Tests for create_checkout_session method."""

    @pytest.mark.asyncio
    async def test_creates_session_successfully(
        self, payment_service: PaymentService
    ) -> None:
        """Test successful checkout session creation."""
        user_id = uuid.uuid4()
        mock_customer = MagicMock()
        mock_customer.id = "cus_test123"
        mock_session = MagicMock()
        mock_session.id = "cs_test_session"
        mock_session.url = "https://checkout.stripe.com/test"

        with patch.object(stripe.Customer, "create", return_value=mock_customer):
            with patch.object(
                stripe.checkout.Session, "create", return_value=mock_session
            ):
                result = await payment_service.create_checkout_session(
                    user_id=user_id,
                    email="test@example.com",
                    tier=SubscriptionTier.PREMIUM,
                    success_url="https://example.com/success",
                    cancel_url="https://example.com/cancel",
                )

        assert isinstance(result, CheckoutSessionResult)
        assert result.session_id == "cs_test_session"
        assert result.url == "https://checkout.stripe.com/test"

    @pytest.mark.asyncio
    async def test_raises_error_for_unconfigured_tier(
        self, payment_service: PaymentService
    ) -> None:
        """Test error raised when tier has no price configured."""
        # Create service without price IDs
        service = PaymentService(secret_key="sk_test_key")

        with pytest.raises(CheckoutSessionError) as exc_info:
            await service.create_checkout_session(
                user_id=uuid.uuid4(),
                email="test@example.com",
                tier=SubscriptionTier.PREMIUM,
                success_url="https://example.com/success",
                cancel_url="https://example.com/cancel",
            )
        assert "No price configured" in str(exc_info.value)


class TestCreatePortalSession:
    """Tests for create_portal_session method."""

    @pytest.mark.asyncio
    async def test_creates_portal_session_successfully(
        self, payment_service: PaymentService
    ) -> None:
        """Test successful portal session creation."""
        mock_session = MagicMock()
        mock_session.url = "https://billing.stripe.com/portal/test"

        with patch.object(
            stripe.billing_portal.Session, "create", return_value=mock_session
        ):
            result = await payment_service.create_portal_session(
                stripe_customer_id="cus_test123",
                return_url="https://example.com/account",
            )

        assert isinstance(result, PortalSessionResult)
        assert result.url == "https://billing.stripe.com/portal/test"

    @pytest.mark.asyncio
    async def test_raises_customer_not_found_error(
        self, payment_service: PaymentService
    ) -> None:
        """Test CustomerNotFoundError raised for invalid customer."""
        with patch.object(
            stripe.billing_portal.Session,
            "create",
            side_effect=stripe.InvalidRequestError(
                message="No such customer", param=None
            ),
        ):
            with pytest.raises(CustomerNotFoundError):
                await payment_service.create_portal_session(
                    stripe_customer_id="cus_invalid",
                    return_url="https://example.com/account",
                )


class TestVerifyWebhookSignature:
    """Tests for verify_webhook_signature method."""

    def test_raises_error_when_secret_not_configured(self) -> None:
        """Test error raised when webhook secret is not set."""
        service = PaymentService(secret_key="sk_test_key", webhook_secret=None)

        with pytest.raises(WebhookVerificationError) as exc_info:
            service.verify_webhook_signature(b"payload", "signature")
        assert "not configured" in str(exc_info.value)

    def test_raises_error_on_invalid_signature(
        self, payment_service: PaymentService
    ) -> None:
        """Test error raised on invalid signature."""
        with patch.object(
            stripe.Webhook,
            "construct_event",
            side_effect=stripe.SignatureVerificationError(
                message="Invalid signature", sig_header=""
            ),
        ):
            with pytest.raises(WebhookVerificationError) as exc_info:
                payment_service.verify_webhook_signature(b"payload", "bad_sig")
            assert "Invalid signature" in str(exc_info.value)


class TestParseWebhookEvent:
    """Tests for parse_webhook_event method."""

    def test_parses_checkout_completed_event(
        self, payment_service: PaymentService
    ) -> None:
        """Test parsing checkout.session.completed event."""
        mock_event = MagicMock()
        mock_event.type = WebhookEventType.CHECKOUT_COMPLETED.value
        mock_event.data.object = {
            "customer": "cus_123",
            "subscription": "sub_456",
            "metadata": {"user_id": "user-uuid", "tier": "premium"},
        }

        result = payment_service.parse_webhook_event(mock_event)

        assert isinstance(result, WebhookEvent)
        assert result.event_type == WebhookEventType.CHECKOUT_COMPLETED.value
        assert result.customer_id == "cus_123"
        assert result.subscription_id == "sub_456"
        assert result.metadata["user_id"] == "user-uuid"

    def test_parses_subscription_updated_event(
        self, payment_service: PaymentService
    ) -> None:
        """Test parsing customer.subscription.updated event."""
        mock_event = MagicMock()
        mock_event.type = WebhookEventType.SUBSCRIPTION_UPDATED.value
        mock_event.data.object = {
            "id": "sub_456",
            "customer": "cus_123",
            "status": "active",
            "items": {"data": [{"price": {"id": "price_premium_123"}}]},
        }

        result = payment_service.parse_webhook_event(mock_event)

        assert result.event_type == WebhookEventType.SUBSCRIPTION_UPDATED.value
        assert result.subscription_id == "sub_456"
        assert result.status == "active"
        assert result.price_id == "price_premium_123"

    def test_parses_subscription_deleted_event(
        self, payment_service: PaymentService
    ) -> None:
        """Test parsing customer.subscription.deleted event."""
        mock_event = MagicMock()
        mock_event.type = WebhookEventType.SUBSCRIPTION_DELETED.value
        mock_event.data.object = {
            "id": "sub_456",
            "customer": "cus_123",
            "status": "canceled",
            "items": {"data": []},
        }

        result = payment_service.parse_webhook_event(mock_event)

        assert result.event_type == WebhookEventType.SUBSCRIPTION_DELETED.value
        assert result.status == "canceled"


class TestGetSubscription:
    """Tests for get_subscription method."""

    @pytest.mark.asyncio
    async def test_returns_subscription_info(
        self, payment_service: PaymentService
    ) -> None:
        """Test successful subscription retrieval."""
        # Create a mock that acts like a Stripe object (supports both dict and attribute access)
        mock_sub = MagicMock()
        mock_sub.__getitem__ = lambda self, key: {
            "id": "sub_123",
            "customer": "cus_456",
            "status": "active",
            "current_period_end": 1234567890,
            "items": {"data": [{"price": {"id": "price_premium_123"}}]},
        }[key]
        mock_sub.id = "sub_123"
        mock_sub.customer = "cus_456"
        mock_sub.status = "active"
        mock_sub.current_period_end = 1234567890

        with patch.object(stripe.Subscription, "retrieve", return_value=mock_sub):
            result = await payment_service.get_subscription("sub_123")

        assert isinstance(result, SubscriptionInfo)
        assert result.tier == SubscriptionTier.PREMIUM
        assert result.status == "active"

    @pytest.mark.asyncio
    async def test_returns_none_for_invalid_subscription(
        self, payment_service: PaymentService
    ) -> None:
        """Test None returned for non-existent subscription."""
        with patch.object(
            stripe.Subscription,
            "retrieve",
            side_effect=stripe.InvalidRequestError(
                message="No such subscription", param=None
            ),
        ):
            result = await payment_service.get_subscription("sub_invalid")
            assert result is None
