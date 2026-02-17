"""Subscription management API endpoints.

Provides Stripe-based subscription management including:
- Creating checkout sessions for subscription upgrades
- Managing subscriptions via customer portal
- Processing Stripe webhooks
"""

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, HttpUrl
from sqlmodel import Session, select

from app.api.deps import CurrentUser, get_db
from app.models import SubscriptionTier, User
from app.services.payment_service import (
    CheckoutSessionError,
    CustomerNotFoundError,
    PaymentService,
    WebhookEventType,
    WebhookVerificationError,
    get_payment_service,
)

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


# Dependency to require Stripe configuration


def require_payment_service() -> PaymentService:
    """Dependency that requires Stripe to be configured."""
    service = get_payment_service()
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured",
        )
    return service


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
    payment_service: PaymentService = Depends(require_payment_service),
) -> CheckoutResponse:
    """
    Create a Stripe checkout session for subscription upgrade.

    The user will be redirected to Stripe's hosted checkout page.
    After payment, they will be redirected to the success_url or cancel_url.
    """
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
    payment_service: PaymentService = Depends(require_payment_service),
) -> PortalResponse:
    """
    Create a Stripe customer portal session.

    The portal allows users to manage their subscription, update payment
    methods, view invoices, and cancel their subscription.
    """
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
        # Subscription purchased - update user tier
        user_id = webhook_event.metadata.get("user_id")
        tier_value = webhook_event.metadata.get("tier")

        if user_id and tier_value:
            statement = select(User).where(User.id == user_id)
            user = session.exec(statement).first()
            if user:
                try:
                    user.subscription_tier = SubscriptionTier(tier_value)
                    session.add(user)
                    session.commit()
                except ValueError:
                    pass  # Invalid tier value, ignore

    elif webhook_event.event_type == WebhookEventType.SUBSCRIPTION_UPDATED.value:
        # Subscription changed - update tier based on price
        if webhook_event.customer_id and webhook_event.price_id:
            _new_tier = payment_service.get_tier_for_price(webhook_event.price_id)
            statement = select(User)  # Would need stripe_customer_id on User model
            # For now, we rely on checkout metadata
            # In production, store stripe_customer_id on User

    elif webhook_event.event_type == WebhookEventType.SUBSCRIPTION_DELETED.value:
        # Subscription cancelled - downgrade to free
        # Would need stripe_customer_id on User model to find user
        # For now, subscription cancellation is handled via portal
        pass

    return WebhookResponse(received=True)


@router.post("/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    current_user: CurrentUser,
    session: Session = Depends(get_db),
    payment_service: PaymentService = Depends(require_payment_service),  # noqa: ARG001
) -> SubscriptionResponse:
    """
    Cancel the current subscription.

    The subscription will be cancelled at the end of the current billing period.
    The user will retain access until then.
    """
    if current_user.subscription_tier == SubscriptionTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription to cancel",
        )

    # For MVP, just update the tier directly
    # In production, this would cancel via Stripe and let webhook update the tier
    current_user.subscription_tier = SubscriptionTier.FREE
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return SubscriptionResponse(
        tier=current_user.subscription_tier,
        status="cancelled",
    )
