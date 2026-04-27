from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

from app import crud
from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core import security
from app.core.config import settings
from app.models import Message, NewPassword, Token, UserPublic, UserUpdate
from app.services import rate_limit_service
from app.utils import (
    generate_password_reset_token,
    generate_reset_password_email,
    send_email,
    verify_password_reset_token,
)

router = APIRouter(tags=["login"])


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr


@router.post("/login/access-token")
def login_access_token(
    session: SessionDep,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    response: Response,
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests.

    .. deprecated::
        Use ``POST /api/v1/auth/login`` instead.  That endpoint accepts a JSON
        body, returns both an access token **and** a refresh token, and
        supports "remember me" / rate limiting.  This endpoint is kept for
        backward compatibility with OAuth2 form-based clients (e.g. the
        auto-generated Swagger UI "Authorize" button) and will be removed in a
        future release.
    """
    if rate_limit_service.is_locked(form_data.username):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again later.",
            headers={"Retry-After": "900"},
        )
    user = crud.authenticate(
        session=session, email=form_data.username, password=form_data.password
    )
    if not user:
        rate_limit_service.record_failed_attempt(form_data.username)
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    rate_limit_service.record_successful_login(form_data.username)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    # Set HttpOnly cookie so the browser never exposes the token to JS
    secure = settings.ENVIRONMENT != "local"
    access_max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
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
        key="logged_in",
        value="1",
        httponly=False,
        secure=secure,
        samesite="lax",
        max_age=access_max_age,
        path="/",
    )
    return Token(access_token=access_token)


@router.post("/login/test-token", response_model=UserPublic)
def test_token(current_user: CurrentUser) -> Any:
    """
    Test access token
    """
    return current_user


@router.post("/password-recovery")
def recover_password(body: PasswordRecoveryRequest, session: SessionDep) -> Message:
    """
    Request a password-recovery email.

    .. deprecated::
        Use ``POST /api/v1/auth/forgot-password`` instead.  That endpoint
        uses the new ``PasswordResetService`` (Redis-backed, 1-hour token TTL)
        rather than the legacy signed-JWT approach.
    """
    email = body.email
    user = crud.get_user_by_email(session=session, email=email)

    # Always return the same response to prevent email enumeration attacks
    # Only send email if user actually exists
    if user:
        password_reset_token = generate_password_reset_token(email=email)
        email_data = generate_reset_password_email(
            email_to=user.email, email=email, token=password_reset_token
        )
        send_email(
            email_to=user.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return Message(
        message="If that email is registered, we sent a password recovery link"
    )


@router.post("/reset-password/")
def reset_password(session: SessionDep, body: NewPassword) -> Message:
    """
    Reset a password using a recovery token.

    .. deprecated::
        Use ``POST /api/v1/auth/reset-password`` instead.  The new endpoint
        uses the ``PasswordResetService`` token format (64-char hex, 1-hour
        TTL, one-time-use) rather than the legacy signed JWT approach.
    """
    email = verify_password_reset_token(token=body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = crud.get_user_by_email(session=session, email=email)
    if not user:
        # Don't reveal that the user doesn't exist - use same error as invalid token
        raise HTTPException(status_code=400, detail="Invalid token")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    user_in_update = UserUpdate(password=body.new_password)
    crud.update_user(
        session=session,
        db_user=user,
        user_in=user_in_update,
    )
    return Message(message="Password updated successfully")


@router.post(
    "/password-recovery-html-content",
    dependencies=[Depends(get_current_active_superuser)],
    response_class=HTMLResponse,
)
def recover_password_html_content(
    body: PasswordRecoveryRequest, session: SessionDep
) -> Any:
    """
    HTML Content for Password Recovery
    """
    email = body.email
    user = crud.get_user_by_email(session=session, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )

    return HTMLResponse(
        content=email_data.html_content, headers={"subject:": email_data.subject}
    )
