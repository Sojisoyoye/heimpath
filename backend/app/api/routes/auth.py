"""Authentication API endpoints.

Provides registration and login endpoints with:
- Password strength validation
- Rate limiting for login attempts
- JWT access and refresh tokens
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import Session, select

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.crud import DUMMY_HASH
from app.models import User
from app.schemas.auth import (
    AuthToken,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
)
from app.services import auth_service, rate_limit_service
from app.services.email_verification_service import (
    TOKEN_EXPIRY_HOURS as EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
)
from app.services.email_verification_service import (
    consume_token as consume_verification_token,
)
from app.services.email_verification_service import (
    generate_token as generate_verification_token,
)
from app.services.password_reset_service import (
    consume_token as consume_reset_token,
)
from app.services.password_reset_service import (
    generate_token as generate_reset_token,
)
from app.utils import (
    generate_email_verification_email,
    generate_reset_password_email,
    send_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    request: RegisterRequest,
    session: Session = Depends(get_db),
) -> User:
    """
    Register a new user account.

    Password requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 number

    Rate limiting: 3 attempts per hour.

    Returns the created user (without password).
    """
    # Check rate limit before processing
    if rate_limit_service.is_register_locked(request.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please try again later.",
            headers={"Retry-After": "3600"},
        )

    # Check if email already exists
    statement = select(User).where(User.email == request.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        rate_limit_service.record_register_attempt(request.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    # Create user with hashed password
    hashed_password = get_password_hash(request.password)
    user = User(
        email=request.email,
        hashed_password=hashed_password,
        full_name=request.full_name,
        citizenship=request.citizenship,
        is_active=True,
        is_superuser=False,
        email_verified=False,
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    # Post-commit operations: rate limiting, verification email.
    # These must not fail the registration — the user is already persisted.
    try:
        rate_limit_service.record_register_attempt(request.email)
    except Exception:
        logger.warning("Failed to record register rate-limit for %s", request.email)

    try:
        token_data = generate_verification_token(
            user_id=str(user.id),
            email=user.email,
        )

        if settings.emails_enabled:
            email_data = generate_email_verification_email(
                email_to=user.email,
                token=token_data.token,
                valid_hours=EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
            )
            send_email(
                email_to=user.email,
                subject=email_data.subject,
                html_content=email_data.html_content,
            )
    except Exception:
        logger.exception("Failed to send verification email to %s", user.email)

    return user


@router.post("/login", response_model=AuthToken)
async def login(
    request: LoginRequest,
    response: Response,
    session: Session = Depends(get_db),
) -> AuthToken:
    """
    Authenticate user and return JWT tokens.

    Rate limiting: After 5 failed attempts, the account is locked for 15 minutes.

    Returns access token (24h or 30d with remember_me) and refresh token (7d).
    Also sets HttpOnly cookies: ``access_token``, ``refresh_token``, and a
    JS-readable ``logged_in`` indicator cookie.
    """
    # Check if account is locked due to rate limiting
    if rate_limit_service.is_locked(request.email):
        status_info = rate_limit_service.get_status(request.email)
        retry_after = 900  # Default 15 minutes
        if status_info.lockout_expires_at:
            retry_after = int(
                (
                    status_info.lockout_expires_at - datetime.now(timezone.utc)
                ).total_seconds()
            )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again later.",
            headers={"Retry-After": str(max(retry_after, 1))},
        )

    # Find user by email
    statement = select(User).where(User.email == request.email)
    user = session.exec(statement).first()

    # Verify credentials
    if not user:
        # Still run password verification to prevent timing attacks
        verify_password(request.password, DUMMY_HASH)
        rate_limit_service.record_failed_attempt(request.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    verified, updated_hash = verify_password(request.password, user.hashed_password)
    if not verified:
        rate_info = rate_limit_service.record_failed_attempt(request.email)
        detail = "Incorrect email or password"
        if rate_info.is_locked:
            detail = "Too many failed login attempts. Account locked for 15 minutes."
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Update password hash if needed (for hash algorithm upgrades)
    if updated_hash:
        user.hashed_password = updated_hash
        session.add(user)
        session.commit()

    # Clear failed attempts on successful login
    rate_limit_service.record_successful_login(request.email)

    # Generate tokens
    access_token = auth_service.create_access_token(
        subject=str(user.id),
        remember_me=request.remember_me,
    )
    refresh_token_value = auth_service.create_refresh_token(subject=str(user.id))

    # Set HttpOnly cookies so the browser never exposes tokens to JS
    secure = settings.ENVIRONMENT != "local"
    access_max_age = (
        settings.REMEMBER_ME_EXPIRE_DAYS * 24 * 60 * 60
        if request.remember_me
        else settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=access_max_age,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_value,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=refresh_max_age,
        path="/",
    )
    # JS-readable indicator so the frontend can check login state synchronously.
    # httponly=False is intentional: this cookie contains no secret, only the
    # boolean "1" to signal to isLoggedIn() that an HttpOnly access token exists.
    response.set_cookie(  # NOSONAR - S3330: httponly=False intentional for UI indicator
        key="logged_in",
        value="1",
        httponly=False,
        secure=secure,
        samesite="lax",
        max_age=access_max_age,
        path="/",
    )

    return AuthToken(
        access_token=access_token,
        refresh_token=refresh_token_value,
    )


@router.post("/refresh", response_model=AuthToken)
async def refresh_token(
    body: RefreshTokenRequest,
    http_request: Request,
    response: Response,
) -> AuthToken:
    """
    Get new access token using refresh token.

    The refresh token is validated and a new access token is issued.
    The same refresh token remains valid until expiration.

    The refresh token may be supplied in the JSON body **or** via the HttpOnly
    ``refresh_token`` cookie set during login.
    """
    token = body.refresh_token or http_request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    new_access_token = auth_service.refresh_access_token(token)
    if new_access_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Rotate the access_token cookie
    secure = settings.ENVIRONMENT != "local"
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    # logged_in follows the refresh token lifetime so the indicator stays valid
    # as long as silent refresh is possible (not just the current access token window).
    # httponly=False is intentional: see the login endpoint comment.
    response.set_cookie(  # NOSONAR - S3330: httponly=False intentional for UI indicator
        key="logged_in",
        value="1",
        httponly=False,
        secure=secure,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )

    return AuthToken(
        access_token=new_access_token,
        refresh_token=token,  # Return same refresh token
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    body: LogoutRequest,
    http_request: Request,
    response: Response,
) -> None:
    """
    Logout by invalidating the refresh token and clearing auth cookies.

    The refresh token (from body or cookie) is blacklisted and cannot be used
    again.  All auth cookies (``access_token``, ``refresh_token``, ``logged_in``)
    are deleted from the browser.
    """
    token = body.refresh_token or http_request.cookies.get("refresh_token")
    if token:
        auth_service.logout(token)
    # Always clear cookies regardless of token validity.
    # secure + samesite must match the attributes used when setting the cookies
    # so that browsers (especially Safari) actually remove them.
    secure = settings.ENVIRONMENT != "local"
    response.delete_cookie(key="access_token", path="/", secure=secure, samesite="lax")
    response.delete_cookie(key="refresh_token", path="/", secure=secure, samesite="lax")
    response.delete_cookie(key="logged_in", path="/", secure=secure, samesite="lax")
    # Always return success even if token was invalid (security best practice)


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    request: VerifyEmailRequest,
    session: Session = Depends(get_db),
) -> VerifyEmailResponse:
    """
    Verify user's email address using verification token.

    The token is consumed after successful verification and cannot be reused.
    Tokens expire after 24 hours.
    """
    # Consume the token (validates and removes it)
    token_data = consume_verification_token(request.token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    # Find user and update email_verified status
    statement = select(User).where(User.id == token_data.user_id)
    user = session.exec(statement).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.email_verified:
        return VerifyEmailResponse(
            message="Email already verified",
            email_verified=True,
        )

    # Verify the email matches (security check)
    if user.email != token_data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email mismatch",
        )

    # Update user
    user.email_verified = True
    session.add(user)
    session.commit()

    return VerifyEmailResponse(
        message="Email verified successfully",
        email_verified=True,
    )


@router.post("/resend-verification", response_model=VerifyEmailResponse)
async def resend_verification(
    request: ResendVerificationRequest,
    session: Session = Depends(get_db),
) -> VerifyEmailResponse:
    """
    Resend email verification link.

    Generates a new verification token and sends it to the user's email.
    Any previous token for the user is invalidated.

    Rate limiting: 3 attempts per hour.

    Note: Always returns success to prevent email enumeration attacks.
    """
    # Check rate limit before processing
    if rate_limit_service.is_resend_verification_locked(request.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification email requests. Please try again later.",
            headers={"Retry-After": "3600"},
        )

    # Record attempt regardless of outcome (prevents email enumeration via timing)
    rate_limit_service.record_resend_verification_attempt(request.email)

    # Find user by email
    statement = select(User).where(User.email == request.email)
    user = session.exec(statement).first()

    # Always return success message (security: prevent email enumeration)
    success_response = VerifyEmailResponse(
        message="If the email is registered, a verification link has been sent",
        email_verified=False,
    )

    if user is None:
        return success_response

    if user.email_verified:
        return VerifyEmailResponse(
            message="Email already verified",
            email_verified=True,
        )

    # Generate new verification token and send email
    try:
        token_data = generate_verification_token(
            user_id=str(user.id),
            email=user.email,
        )

        if settings.emails_enabled:
            email_data = generate_email_verification_email(
                email_to=user.email,
                token=token_data.token,
                valid_hours=EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
            )
            send_email(
                email_to=user.email,
                subject=email_data.subject,
                html_content=email_data.html_content,
            )
    except Exception:
        logger.exception("Failed to send verification email to %s", user.email)

    return success_response


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    session: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """
    Request a password reset link.

    Generates a reset token and sends it to the user's email.
    Tokens expire after 1 hour.

    Rate limiting: 3 attempts per hour.

    Note: Always returns success to prevent email enumeration attacks.
    """
    # Check rate limit before processing
    if rate_limit_service.is_password_reset_locked(request.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset attempts. Please try again later.",
            headers={"Retry-After": "3600"},
        )

    success_response = ForgotPasswordResponse(
        message="If that email is registered, we sent a password reset link",
    )

    # Record attempt regardless of outcome (prevents email enumeration via timing)
    rate_limit_service.record_password_reset_attempt(request.email)

    statement = select(User).where(User.email == request.email)
    user = session.exec(statement).first()

    if user is None or not user.is_active:
        return success_response

    try:
        token_data = generate_reset_token(
            user_id=str(user.id),
            email=user.email,
        )

        if settings.emails_enabled:
            email_data = generate_reset_password_email(
                email_to=user.email,
                email=user.email,
                token=token_data.token,
            )
            send_email(
                email_to=user.email,
                subject=email_data.subject,
                html_content=email_data.html_content,
            )
    except Exception:
        logger.exception("Failed to send password reset email to %s", user.email)

    return success_response


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    request: ResetPasswordRequest,
    session: Session = Depends(get_db),
) -> ResetPasswordResponse:
    """
    Reset password using a reset token.

    The token is consumed after use and cannot be reused.
    Tokens expire after 1 hour.
    """
    token_data = consume_reset_token(request.token)

    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token",
        )

    statement = select(User).where(User.id == token_data.user_id)
    user = session.exec(statement).first()

    if user is None or not user.is_active:
        # Avoid leaking whether the user exists
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token",
        )

    # Verify email matches the token (defense in depth)
    if user.email != token_data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token",
        )

    user.hashed_password = get_password_hash(request.new_password)
    session.add(user)
    session.commit()

    return ResetPasswordResponse(message="Password reset successfully")
