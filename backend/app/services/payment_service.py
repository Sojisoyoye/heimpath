"""Stripe Payment Service.

Provides subscription management via Stripe including checkout sessions,
customer portal, and webhook processing.
"""
import uuid
from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from typing import Any

import stripe
from stripe import InvalidRequestError, SignatureVerificationError

from app.core.config import settings
from app.models import SubscriptionTier


class PaymentError(Exception):
    """Base exception for payment-related errors."""

    pass


class WebhookVerificationError(PaymentError):
    """Raised when webhook signature verification fails."""

    pass


class CustomerNotFoundError(PaymentError):
    """Raised when a Stripe customer is not found."""

    pass


class CheckoutSessionError(PaymentError):
    """Raised when checkout session creation fails."""

    pass


class SubscriptionError(PaymentError):
    """Raised when subscription operations fail."""

    pass


class WebhookEventType(str, Enum):
    """Stripe webhook event types we handle."""

    CHECKOUT_COMPLETED = "checkout.session.completed"
    SUBSCRIPTION_UPDATED = "customer.subscription.updated"
    SUBSCRIPTION_DELETED = "customer.subscription.deleted"
    INVOICE_PAID = "invoice.paid"
    INVOICE_PAYMENT_FAILED = "invoice.payment_failed"


@dataclass
class CheckoutSessionResult:
    """Result of creating a checkout session."""

    session_id: str
    url: str


@dataclass
class PortalSessionResult:
    """Result of creating a customer portal session."""

    url: str


@dataclass
class SubscriptionInfo:
    """Information about a user's subscription."""

    tier: SubscriptionTier
    stripe_customer_id: str | None
    stripe_subscription_id: str | None
    status: str | None
    current_period_end: int | None


@dataclass
class WebhookEvent:
    """Processed webhook event data."""

    event_type: str
    customer_id: str | None
    subscription_id: str | None
    price_id: str | None
    status: str | None
    metadata: dict[str, Any]


class PaymentService:
    """Stripe Payment Service.

    Handles subscription management via Stripe including:
    - Creating checkout sessions for subscription upgrades
    - Creating customer portal sessions for subscription management
    - Processing webhooks for subscription lifecycle events
    - Mapping Stripe price IDs to subscription tiers

    Attributes:
        TIER_PRICE_MAP: Mapping of subscription tiers to Stripe price IDs.
    """

    def __init__(
        self,
        secret_key: str,
        webhook_secret: str | None = None,
        premium_price_id: str | None = None,
        enterprise_price_id: str | None = None,
    ) -> None:
        """Initialize the payment service.

        Args:
            secret_key: Stripe secret API key.
            webhook_secret: Stripe webhook signing secret.
            premium_price_id: Stripe price ID for premium tier.
            enterprise_price_id: Stripe price ID for enterprise tier.
        """
        self._secret_key = secret_key
        self._webhook_secret = webhook_secret
        self._premium_price_id = premium_price_id
        self._enterprise_price_id = enterprise_price_id

        # Configure Stripe
        stripe.api_key = secret_key

        # Build price to tier mapping
        self._price_to_tier: dict[str, SubscriptionTier] = {}
        if premium_price_id:
            self._price_to_tier[premium_price_id] = SubscriptionTier.PREMIUM
        if enterprise_price_id:
            self._price_to_tier[enterprise_price_id] = SubscriptionTier.ENTERPRISE

    def _get_tier_price_id(self, tier: SubscriptionTier) -> str | None:
        """Get the Stripe price ID for a subscription tier."""
        if tier == SubscriptionTier.PREMIUM:
            return self._premium_price_id
        elif tier == SubscriptionTier.ENTERPRISE:
            return self._enterprise_price_id
        return None

    def get_tier_for_price(self, price_id: str) -> SubscriptionTier:
        """Get the subscription tier for a Stripe price ID.

        Args:
            price_id: Stripe price ID.

        Returns:
            Corresponding subscription tier, defaults to FREE if unknown.
        """
        return self._price_to_tier.get(price_id, SubscriptionTier.FREE)

    async def create_customer(
        self,
        user_id: uuid.UUID,
        email: str,
        name: str | None = None,
    ) -> str:
        """Create a Stripe customer for a user.

        Args:
            user_id: User's UUID.
            email: User's email address.
            name: User's full name (optional).

        Returns:
            Stripe customer ID.

        Raises:
            PaymentError: If customer creation fails.
        """
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={"user_id": str(user_id)},
            )
            return customer.id
        except stripe.StripeError as e:
            raise PaymentError(f"Failed to create customer: {e}") from e

    async def get_or_create_customer(
        self,
        user_id: uuid.UUID,
        email: str,
        name: str | None = None,
        stripe_customer_id: str | None = None,
    ) -> str:
        """Get existing or create new Stripe customer.

        Args:
            user_id: User's UUID.
            email: User's email address.
            name: User's full name (optional).
            stripe_customer_id: Existing Stripe customer ID (optional).

        Returns:
            Stripe customer ID.
        """
        if stripe_customer_id:
            try:
                # Verify customer exists
                stripe.Customer.retrieve(stripe_customer_id)
                return stripe_customer_id
            except InvalidRequestError:
                # Customer doesn't exist, create new one
                pass

        return await self.create_customer(user_id, email, name)

    async def create_checkout_session(
        self,
        user_id: uuid.UUID,
        email: str,
        tier: SubscriptionTier,
        success_url: str,
        cancel_url: str,
        stripe_customer_id: str | None = None,
    ) -> CheckoutSessionResult:
        """Create a Stripe checkout session for subscription upgrade.

        Args:
            user_id: User's UUID.
            email: User's email address.
            tier: Target subscription tier.
            success_url: URL to redirect after successful payment.
            cancel_url: URL to redirect if user cancels.
            stripe_customer_id: Existing Stripe customer ID (optional).

        Returns:
            CheckoutSessionResult with session ID and checkout URL.

        Raises:
            CheckoutSessionError: If session creation fails.
        """
        price_id = self._get_tier_price_id(tier)
        if not price_id:
            raise CheckoutSessionError(f"No price configured for tier: {tier}")

        try:
            # Get or create customer
            customer_id = await self.get_or_create_customer(
                user_id=user_id,
                email=email,
                stripe_customer_id=stripe_customer_id,
            )

            session = stripe.checkout.Session.create(
                customer=customer_id,
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={"user_id": str(user_id), "tier": tier.value},
            )

            return CheckoutSessionResult(
                session_id=session.id,
                url=session.url or "",
            )
        except stripe.StripeError as e:
            raise CheckoutSessionError(f"Failed to create checkout session: {e}") from e

    async def create_portal_session(
        self,
        stripe_customer_id: str,
        return_url: str,
    ) -> PortalSessionResult:
        """Create a Stripe customer portal session.

        Args:
            stripe_customer_id: Stripe customer ID.
            return_url: URL to return to after portal session.

        Returns:
            PortalSessionResult with portal URL.

        Raises:
            CustomerNotFoundError: If customer doesn't exist.
            PaymentError: If portal session creation fails.
        """
        try:
            session = stripe.billing_portal.Session.create(
                customer=stripe_customer_id,
                return_url=return_url,
            )
            return PortalSessionResult(url=session.url)
        except InvalidRequestError as e:
            if "No such customer" in str(e):
                raise CustomerNotFoundError(
                    f"Customer not found: {stripe_customer_id}"
                ) from e
            raise PaymentError(f"Failed to create portal session: {e}") from e
        except stripe.StripeError as e:
            raise PaymentError(f"Failed to create portal session: {e}") from e

    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True,
    ) -> None:
        """Cancel a subscription.

        Args:
            subscription_id: Stripe subscription ID.
            at_period_end: If True, cancel at end of billing period.

        Raises:
            SubscriptionError: If cancellation fails.
        """
        try:
            if at_period_end:
                stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True,
                )
            else:
                stripe.Subscription.cancel(subscription_id)
        except stripe.StripeError as e:
            raise SubscriptionError(f"Failed to cancel subscription: {e}") from e

    async def get_subscription(
        self,
        subscription_id: str,
    ) -> SubscriptionInfo | None:
        """Get subscription information.

        Args:
            subscription_id: Stripe subscription ID.

        Returns:
            SubscriptionInfo or None if not found.
        """
        try:
            sub = stripe.Subscription.retrieve(subscription_id)
            price_id = sub["items"]["data"][0]["price"]["id"] if sub["items"]["data"] else None
            tier = self.get_tier_for_price(price_id) if price_id else SubscriptionTier.FREE

            return SubscriptionInfo(
                tier=tier,
                stripe_customer_id=sub.customer,
                stripe_subscription_id=sub.id,
                status=sub.status,
                current_period_end=sub.current_period_end,
            )
        except InvalidRequestError:
            return None
        except stripe.StripeError:
            return None

    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
    ) -> stripe.Event:
        """Verify and parse a Stripe webhook event.

        Args:
            payload: Raw webhook payload bytes.
            signature: Stripe-Signature header value.

        Returns:
            Parsed Stripe event.

        Raises:
            WebhookVerificationError: If signature verification fails.
        """
        if not self._webhook_secret:
            raise WebhookVerificationError("Webhook secret not configured")

        try:
            return stripe.Webhook.construct_event(
                payload,
                signature,
                self._webhook_secret,
            )
        except SignatureVerificationError as e:
            raise WebhookVerificationError(f"Invalid signature: {e}") from e
        except ValueError as e:
            raise WebhookVerificationError(f"Invalid payload: {e}") from e

    def parse_webhook_event(self, event: stripe.Event) -> WebhookEvent:
        """Parse a Stripe webhook event into our domain model.

        Args:
            event: Stripe event object.

        Returns:
            Parsed WebhookEvent with relevant data.
        """
        event_data = event.data.object
        metadata: dict[str, Any] = {}

        customer_id: str | None = None
        subscription_id: str | None = None
        price_id: str | None = None
        status: str | None = None

        if event.type == WebhookEventType.CHECKOUT_COMPLETED.value:
            customer_id = event_data.get("customer")
            subscription_id = event_data.get("subscription")
            metadata = event_data.get("metadata", {})

        elif event.type in (
            WebhookEventType.SUBSCRIPTION_UPDATED.value,
            WebhookEventType.SUBSCRIPTION_DELETED.value,
        ):
            customer_id = event_data.get("customer")
            subscription_id = event_data.get("id")
            status = event_data.get("status")
            items = event_data.get("items", {}).get("data", [])
            if items:
                price_id = items[0].get("price", {}).get("id")

        elif event.type in (
            WebhookEventType.INVOICE_PAID.value,
            WebhookEventType.INVOICE_PAYMENT_FAILED.value,
        ):
            customer_id = event_data.get("customer")
            subscription_id = event_data.get("subscription")

        return WebhookEvent(
            event_type=event.type,
            customer_id=customer_id,
            subscription_id=subscription_id,
            price_id=price_id,
            status=status,
            metadata=metadata,
        )


# Singleton instance
_payment_service: PaymentService | None = None


@lru_cache
def get_payment_service() -> PaymentService | None:
    """Get the payment service singleton.

    Returns:
        PaymentService instance if Stripe is configured, None otherwise.
    """
    global _payment_service
    if _payment_service is None and settings.stripe_enabled:
        _payment_service = PaymentService(
            secret_key=settings.STRIPE_SECRET_KEY or "",
            webhook_secret=settings.STRIPE_WEBHOOK_SECRET,
            premium_price_id=settings.STRIPE_PREMIUM_PRICE_ID,
            enterprise_price_id=settings.STRIPE_ENTERPRISE_PRICE_ID,
        )
    return _payment_service
