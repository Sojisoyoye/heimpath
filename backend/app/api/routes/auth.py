"""Authentication API endpoints.

Provides registration and login endpoints with:
- Password strength validation
- Rate limiting for login attempts
- JWT access and refresh tokens
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_db
from app.core.security import get_password_hash, verify_password
from app.models import User
from app.core.config import settings
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
from app.services.auth_service import get_auth_service
from app.services.email_verification_service import get_email_verification_service
from app.services.password_reset_service import get_password_reset_service
from app.services.rate_limit_service import get_login_rate_limiter
from app.utils import (
    generate_email_verification_email,
    generate_password_reset_email_v2,
    send_email,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    request: RegisterRequest,
    session: Session = Depends(get_db),
) -> User:
    """
    Register a new user account.

    Password requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 number

    Returns the created user (without password).
    """
    # Check if email already exists
    statement = select(User).where(User.email == request.email)
    existing_user = session.exec(statement).first()
    if existing_user:
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

    # Generate verification token and send email
    verification_service = get_email_verification_service()
    token_data = verification_service.generate_token(
        user_id=str(user.id),
        email=user.email,
    )

    if settings.emails_enabled:
        email_data = generate_email_verification_email(
            email_to=user.email,
            token=token_data.token,
            valid_hours=verification_service.TOKEN_EXPIRY_HOURS,
        )
        send_email(
            email_to=user.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )

    return user


@router.post("/login", response_model=AuthToken)
def login(
    request: LoginRequest,
    session: Session = Depends(get_db),
) -> AuthToken:
    """
    Authenticate user and return JWT tokens.

    Rate limiting: After 5 failed attempts, the account is locked for 15 minutes.

    Returns access token (24h or 30d with remember_me) and refresh token (7d).
    """
    rate_limiter = get_login_rate_limiter()

    # Check if account is locked due to rate limiting
    if rate_limiter.is_locked(request.email):
        status_info = rate_limiter.get_status(request.email)
        retry_after = 900  # Default 15 minutes
        if status_info.lockout_expires_at:
            retry_after = int(
                (status_info.lockout_expires_at - datetime.now(timezone.utc)).total_seconds()
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
        # Use a dummy hash to maintain constant time
        verify_password(
            request.password,
            "$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash",
        )
        rate_limiter.record_failed_attempt(request.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    verified, updated_hash = verify_password(request.password, user.hashed_password)
    if not verified:
        rate_info = rate_limiter.record_failed_attempt(request.email)
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
    rate_limiter.record_successful_login(request.email)

    # Generate tokens
    auth_service = get_auth_service()
    access_token = auth_service.create_access_token(
        subject=str(user.id),
        remember_me=request.remember_me,
    )
    refresh_token = auth_service.create_refresh_token(subject=str(user.id))

    return AuthToken(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=AuthToken)
def refresh_token(request: RefreshTokenRequest) -> AuthToken:
    """
    Get new access token using refresh token.

    The refresh token is validated and a new access token is issued.
    The same refresh token remains valid until expiration.
    """
    auth_service = get_auth_service()

    new_access_token = auth_service.refresh_access_token(request.refresh_token)
    if new_access_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    return AuthToken(
        access_token=new_access_token,
        refresh_token=request.refresh_token,  # Return same refresh token
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: LogoutRequest) -> None:
    """
    Logout by invalidating the refresh token.

    The refresh token is blacklisted and cannot be used again.
    """
    auth_service = get_auth_service()
    auth_service.logout(request.refresh_token)
    # Always return success even if token was invalid (security best practice)


@router.post("/verify-email", response_model=VerifyEmailResponse)
def verify_email(
    request: VerifyEmailRequest,
    session: Session = Depends(get_db),
) -> VerifyEmailResponse:
    """
    Verify user's email address using verification token.

    The token is consumed after successful verification and cannot be reused.
    Tokens expire after 24 hours.
    """
    verification_service = get_email_verification_service()

    # Consume the token (validates and removes it)
    token_data = verification_service.consume_token(request.token)
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
def resend_verification(
    request: ResendVerificationRequest,
    session: Session = Depends(get_db),
) -> VerifyEmailResponse:
    """
    Resend email verification link.

    Generates a new verification token and sends it to the user's email.
    Any previous token for the user is invalidated.

    Note: Always returns success to prevent email enumeration attacks.
    """
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

    # Generate new verification token
    verification_service = get_email_verification_service()
    token_data = verification_service.generate_token(
        user_id=str(user.id),
        email=user.email,
    )

    # Send verification email (only if email service is configured)
    if settings.emails_enabled:
        email_data = generate_email_verification_email(
            email_to=user.email,
            token=token_data.token,
            valid_hours=verification_service.TOKEN_EXPIRY_HOURS,
        )
        send_email(
            email_to=user.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )

    return success_response
