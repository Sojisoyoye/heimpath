"""Subscription management API endpoints.

Provides Stripe-based subscription management including:
- Creating checkout sessions for subscription upgrades
- Managing subscriptions via customer portal
- Processing Stripe webhooks
"""

import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, HttpUrl
from sqlmodel import Session, select

from app.api.deps import CurrentUser, get_db
from app.models import SubscriptionTier, User
from app.services.payment_service import (
    CheckoutSessionError,
    CustomerNotFoundError,
    SubscriptionError,
    WebhookEventType,
    WebhookVerificationError,
    get_payment_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


# Request/Response Schemas


class CreateCheckoutRequest(BaseModel):
    """Request to create a checkout session."""

    tier: SubscriptionTier
    success_url: HttpUrl
    cancel_url: HttpUrl


class CheckoutResponse(BaseModel):
    """Response with checkout session details."""

    session_id: str
    url: str


class PortalRequest(BaseModel):
    """Request to create a customer portal session."""

    return_url: HttpUrl


class PortalResponse(BaseModel):
    """Response with portal session URL."""

    url: str


class SubscriptionResponse(BaseModel):
    """Current subscription status."""

    tier: SubscriptionTier
    stripe_customer_id: str | None = None
    status: str | None = None


class WebhookResponse(BaseModel):
    """Webhook processing response."""

    received: bool


# Endpoints


@router.get("/current", response_model=SubscriptionResponse)
def get_current_subscription(
    current_user: CurrentUser,
) -> SubscriptionResponse:
    """
    Get the current user's subscription status.

    Returns the subscription tier and status.
    """
    return SubscriptionResponse(
        tier=current_user.subscription_tier,
        stripe_customer_id=getattr(current_user, "stripe_customer_id", None),
        status="active"
        if current_user.subscription_tier != SubscriptionTier.FREE
        else None,
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CreateCheckoutRequest,
    current_user: CurrentUser,
) -> CheckoutResponse:
    """
    Create a Stripe checkout session for subscription upgrade.

    The user will be redirected to Stripe's hosted checkout page.
    After payment, they will be redirected to the success_url or cancel_url.
    """
    payment_service = get_payment_service()
    if payment_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured",
        )

    if request.tier == SubscriptionTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot checkout for free tier",
        )

    if current_user.subscription_tier == request.tier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Already subscribed to {request.tier.value} tier",
        )

    try:
        result = await payment_service.create_checkout_session(
            user_id=current_user.id,
            email=current_user.email,
            tier=request.tier,
            success_url=str(request.success_url),
            cancel_url=str(request.cancel_url),
            stripe_customer_id=getattr(current_user, "stripe_customer_id", None),
        )
        return CheckoutResponse(session_id=result.session_id, url=result.url)
    except CheckoutSessionError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/portal", response_model=PortalResponse)
async def create_portal_session(
    request: PortalRequest,
    current_user: CurrentUser,
) -> PortalResponse:
    """
    Create a Stripe customer portal session.

    The portal allows users to manage their subscription, update payment
    methods, view invoices, and cancel their subscription.
    """
    payment_service = get_payment_service()
    if payment_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured",
        )

    stripe_customer_id = getattr(current_user, "stripe_customer_id", None)
    if not stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found",
        )

    try:
        result = await payment_service.create_portal_session(
            stripe_customer_id=stripe_customer_id,
            return_url=str(request.return_url),
        )
        return PortalResponse(url=result.url)
    except CustomerNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found in payment system",
        )


@router.post("/webhook", response_model=WebhookResponse)
async def handle_webhook(
    request: Request,
    session: Session = Depends(get_db),
    stripe_signature: str = Header(alias="Stripe-Signature"),
) -> WebhookResponse:
    """
    Handle Stripe webhook events.

    This endpoint receives events from Stripe about subscription changes
    and updates user subscription tiers accordingly.

    Events handled:
    - checkout.session.completed: Activate subscription after payment
    - customer.subscription.updated: Update tier on subscription changes
    - customer.subscription.deleted: Downgrade to free on cancellation
    """
    payment_service = get_payment_service()
    if payment_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured",
        )

    # Get raw body for signature verification
    payload = await request.body()

    try:
        event = payment_service.verify_webhook_signature(payload, stripe_signature)
    except WebhookVerificationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Parse the event
    webhook_event = payment_service.parse_webhook_event(event)

    # Handle different event types
    if webhook_event.event_type == WebhookEventType.CHECKOUT_COMPLETED.value:
        # Subscription purchased — derive tier from price_id, not metadata,
        # to prevent tier elevation via attacker-controlled metadata values.
        user_id = webhook_event.metadata.get("user_id")
        session_id = event["data"]["object"]["id"]

        if user_id:
            price_id = payment_service.get_checkout_price_id(session_id)
            if price_id is None:
                logger.warning(
                    "checkout.session.completed: no line items for session %s",
                    session_id,
                )
                return WebhookResponse(received=True)

            tier = payment_service.get_tier_for_price(price_id)
            if tier == SubscriptionTier.FREE:
                logger.warning(
                    "checkout.session.completed: unknown price_id %s for session %s",
                    price_id,
                    session_id,
                )
                return WebhookResponse(received=True)

            statement = select(User).where(User.id == user_id)
            user = session.exec(statement).first()
            if user:
                user.subscription_tier = tier
                user.stripe_customer_id = webhook_event.customer_id
                user.stripe_subscription_id = webhook_event.subscription_id
                session.add(user)
                session.commit()

    elif webhook_event.event_type == WebhookEventType.SUBSCRIPTION_UPDATED.value:
        # Subscription plan changed — update tier from the new price_id.
        if webhook_event.customer_id and webhook_event.price_id:
            statement = select(User).where(
                User.stripe_customer_id == webhook_event.customer_id
            )
            user = session.exec(statement).first()
            if user:
                new_tier = payment_service.get_tier_for_price(webhook_event.price_id)
                user.subscription_tier = new_tier
                session.add(user)
                session.commit()

    elif webhook_event.event_type == WebhookEventType.SUBSCRIPTION_DELETED.value:
        # Subscription ended — downgrade to FREE.
        if webhook_event.customer_id:
            statement = select(User).where(
                User.stripe_customer_id == webhook_event.customer_id
            )
            user = session.exec(statement).first()
            if user:
                user.subscription_tier = SubscriptionTier.FREE
                user.stripe_subscription_id = None
                session.add(user)
                session.commit()

    return WebhookResponse(received=True)


@router.post("/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    current_user: CurrentUser,
) -> SubscriptionResponse:
    """
    Cancel the current subscription.

    Calls Stripe to schedule cancellation at end of billing period.
    The user retains access until the period ends; the DB tier is
    only downgraded when the customer.subscription.deleted webhook fires.
    """
    payment_service = get_payment_service()
    if payment_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured",
        )

    if current_user.subscription_tier == SubscriptionTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription to cancel",
        )

    stripe_subscription_id = getattr(current_user, "stripe_subscription_id", None)
    if not stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe subscription found — contact support",
        )

    try:
        await payment_service.cancel_subscription(
            stripe_subscription_id, at_period_end=True
        )
    except SubscriptionError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )

    return SubscriptionResponse(
        tier=current_user.subscription_tier,
        stripe_customer_id=getattr(current_user, "stripe_customer_id", None),
        status="cancellation_scheduled",
    )
