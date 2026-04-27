import base64
import io
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from PIL import Image
from sqlmodel import func, select

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import (
    Message,
    UpdatePassword,
    User,
    UserCreate,
    UserPublic,
    UserRegister,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)
from app.schemas.user import UserDataExport
from app.services import auth_service
from app.utils import generate_new_account_email, send_email

router = APIRouter(prefix="/users", tags=["users"])

MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_AVATAR_DIMENSION = 256
AVATAR_WEBP_QUALITY = 80


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UsersPublic,
)
async def read_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve users.
    """

    count_statement = select(func.count()).select_from(User)
    count = session.exec(count_statement).one()

    statement = select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    users = session.exec(statement).all()

    return UsersPublic(data=users, count=count)


@router.post(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=UserPublic
)
async def create_user(*, session: SessionDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    user = crud.create_user(session=session, user_create=user_in)
    if settings.emails_enabled and user_in.email:
        email_data = generate_new_account_email(
            email_to=user_in.email, username=user_in.email, password=user_in.password
        )
        send_email(
            email_to=user_in.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return user


@router.patch("/me", response_model=UserPublic)
async def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """

    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
    user_data = user_in.model_dump(exclude_unset=True)
    # Invalidate email verification when the email address changes
    if "email" in user_data and user_data["email"] != current_user.email:
        user_data["email_verified"] = False
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.patch("/me/password", response_model=Message)
async def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    verified, _ = verify_password(body.current_password, current_user.hashed_password)
    if not verified:
        raise HTTPException(status_code=400, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    hashed_password = get_password_hash(body.new_password)
    current_user.hashed_password = hashed_password
    session.add(current_user)
    session.commit()
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserPublic)
async def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user


@router.get("/me/export", response_model=UserDataExport)
async def export_user_data(current_user: CurrentUser) -> Any:
    """
    Export all user data (GDPR Article 20 - Right to Data Portability).

    Returns all user data in a portable JSON format including:
    - User profile information
    - Account metadata
    """
    return UserDataExport(
        export_date=datetime.now(timezone.utc),
        export_format_version="1.0",
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        citizenship=current_user.citizenship,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified,
        avatar_url=current_user.avatar_url,
        subscription_tier=current_user.subscription_tier.value
        if hasattr(current_user.subscription_tier, "value")
        else str(current_user.subscription_tier),
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_me(
    session: SessionDep,
    current_user: CurrentUser,
    http_request: Request,
    response: Response,
) -> None:
    """
    Delete own user.
    """
    if current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    # Invalidate the refresh token stored in the browser cookie so it cannot be
    # used to obtain new access tokens after the account no longer exists.
    refresh_token = http_request.cookies.get("refresh_token")
    if refresh_token:
        auth_service.logout(refresh_token)
    session.delete(current_user)
    session.commit()
    # Clear all auth cookies so the browser stops sending them.
    secure = settings.ENVIRONMENT != "local"
    response.delete_cookie(key="access_token", path="/", secure=secure, samesite="lax")
    response.delete_cookie(key="refresh_token", path="/", secure=secure, samesite="lax")
    response.delete_cookie(key="logged_in", path="/", secure=secure, samesite="lax")


@router.put(
    "/me/avatar",
    response_model=UserPublic,
    responses={400: {"description": "Invalid file type, size, or unreadable image"}},
)
async def upload_avatar(
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile,
) -> Any:
    """Upload or replace the current user's avatar."""
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed: JPEG, PNG, WebP.",
        )

    data = await file.read()
    if len(data) > MAX_AVATAR_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 2 MB.",
        )

    try:
        img = Image.open(io.BytesIO(data))
    except OSError:
        raise HTTPException(status_code=400, detail="Cannot read image file.")

    if img.format not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed: JPEG, PNG, WebP.",
        )

    img.thumbnail((MAX_AVATAR_DIMENSION, MAX_AVATAR_DIMENSION), Image.LANCZOS)
    img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=AVATAR_WEBP_QUALITY)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")

    current_user.avatar_url = f"data:image/webp;base64,{encoded}"
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.delete("/me/avatar", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avatar(
    session: SessionDep,
    current_user: CurrentUser,
) -> None:
    """Remove the current user's avatar."""
    current_user.avatar_url = None
    session.add(current_user)
    session.commit()


@router.post("/signup", response_model=UserPublic)
async def register_user(session: SessionDep, user_in: UserRegister) -> Any:
    """
    Create new user without the need to be logged in.

    .. deprecated::
        Use ``POST /api/v1/auth/register`` instead.  That endpoint enforces
        password strength rules, sets ``email_verified=False``, sends a
        verification email, and returns HTTP 201.  This endpoint is kept for
        backward compatibility only.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    user_create = UserCreate.model_validate(user_in)
    user = crud.create_user(session=session, user_create=user_create)
    return user


@router.get("/{user_id}", response_model=UserPublic)
async def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        return user
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )
    return user


@router.patch(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
async def update_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
) -> Any:
    """
    Update a user.
    """

    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )

    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user


@router.delete(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user(
    session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> None:
    """
    Delete a user.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    session.delete(user)
    session.commit()
