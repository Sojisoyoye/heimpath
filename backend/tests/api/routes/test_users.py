import base64
import io
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image
from sqlmodel import Session, select

from app import crud
from app.core.config import settings
from app.core.security import verify_password
from app.models import User, UserCreate
from tests.utils.user import create_random_user
from tests.utils.utils import random_email, random_lower_string


def test_get_users_superuser_me(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=superuser_token_headers)
    current_user = r.json()
    assert current_user
    assert current_user["is_active"] is True
    assert current_user["is_superuser"]
    assert current_user["email"] == settings.FIRST_SUPERUSER


def test_get_users_normal_user_me(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers)
    current_user = r.json()
    assert current_user
    assert current_user["is_active"] is True
    assert current_user["is_superuser"] is False
    assert current_user["email"] == settings.EMAIL_TEST_USER


def test_create_user_new_email(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    with (
        patch("app.utils.send_email", return_value=None),
        patch("app.core.config.settings.SMTP_HOST", "smtp.example.com"),
        patch("app.core.config.settings.SMTP_USER", "admin@example.com"),
    ):
        username = random_email()
        password = random_lower_string()
        data = {"email": username, "password": password}
        r = client.post(
            f"{settings.API_V1_STR}/users/",
            headers=superuser_token_headers,
            json=data,
        )
        assert 200 <= r.status_code < 300
        created_user = r.json()
        user = crud.get_user_by_email(session=db, email=username)
        assert user
        assert user.email == created_user["email"]


def test_get_existing_user_as_superuser(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    user_id = user.id
    r = client.get(
        f"{settings.API_V1_STR}/users/{user_id}",
        headers=superuser_token_headers,
    )
    assert 200 <= r.status_code < 300
    api_user = r.json()
    existing_user = crud.get_user_by_email(session=db, email=username)
    assert existing_user
    assert existing_user.email == api_user["email"]


def test_get_non_existing_user_as_superuser(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/users/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert r.json() == {"detail": "User not found"}


def test_get_existing_user_current_user(client: TestClient, db: Session) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    user_id = user.id

    login_data = {
        "username": username,
        "password": password,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}

    r = client.get(
        f"{settings.API_V1_STR}/users/{user_id}",
        headers=headers,
    )
    assert 200 <= r.status_code < 300
    api_user = r.json()
    existing_user = crud.get_user_by_email(session=db, email=username)
    assert existing_user
    assert existing_user.email == api_user["email"]


def test_get_existing_user_permissions_error(
    db: Session,
    client: TestClient,
    normal_user_token_headers: dict[str, str],
) -> None:
    user = create_random_user(db)

    r = client.get(
        f"{settings.API_V1_STR}/users/{user.id}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 403
    assert r.json() == {"detail": "The user doesn't have enough privileges"}


def test_get_non_existing_user_returns_not_found(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
) -> None:
    # M7: existence check must happen before permission check to prevent enumeration
    user_id = uuid.uuid4()

    r = client.get(
        f"{settings.API_V1_STR}/users/{user_id}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 404
    assert r.json() == {"detail": "User not found"}


def test_create_user_existing_username(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    username = random_email()
    # username = email
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    crud.create_user(session=db, user_create=user_in)
    data = {"email": username, "password": password}
    r = client.post(
        f"{settings.API_V1_STR}/users/",
        headers=superuser_token_headers,
        json=data,
    )
    created_user = r.json()
    assert r.status_code == 400
    assert "_id" not in created_user


def test_create_user_by_normal_user(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    username = random_email()
    password = random_lower_string()
    data = {"email": username, "password": password}
    r = client.post(
        f"{settings.API_V1_STR}/users/",
        headers=normal_user_token_headers,
        json=data,
    )
    assert r.status_code == 403


def test_retrieve_users(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    crud.create_user(session=db, user_create=user_in)

    username2 = random_email()
    password2 = random_lower_string()
    user_in2 = UserCreate(email=username2, password=password2)
    crud.create_user(session=db, user_create=user_in2)

    r = client.get(f"{settings.API_V1_STR}/users/", headers=superuser_token_headers)
    all_users = r.json()

    assert len(all_users["data"]) > 1
    assert "count" in all_users
    for item in all_users["data"]:
        assert "email" in item


def test_update_user_me(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    full_name = "Updated Name"
    email = random_email()
    data = {"full_name": full_name, "email": email}
    r = client.patch(
        f"{settings.API_V1_STR}/users/me",
        headers=normal_user_token_headers,
        json=data,
    )
    assert r.status_code == 200
    updated_user = r.json()
    assert updated_user["email"] == email
    assert updated_user["full_name"] == full_name

    user_query = select(User).where(User.email == email)
    user_db = db.exec(user_query).first()
    assert user_db
    assert user_db.email == email
    assert user_db.full_name == full_name


def test_user_onboarding_defaults(client: TestClient, db: Session) -> None:
    """New users should have onboarding_completed=False by default."""
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    crud.create_user(session=db, user_create=user_in)

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = client.get(f"{settings.API_V1_STR}/users/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["onboarding_completed"] is False
    assert r.json()["onboarding_persona"] is None


def test_update_onboarding_status(client: TestClient, db: Session) -> None:
    """Users can update their onboarding status via PATCH /me."""
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    crud.create_user(session=db, user_create=user_in)

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    data = {"onboarding_completed": True, "onboarding_persona": "explorer"}
    r = client.patch(
        f"{settings.API_V1_STR}/users/me",
        headers=headers,
        json=data,
    )
    assert r.status_code == 200
    updated_user = r.json()
    assert updated_user["onboarding_completed"] is True
    assert updated_user["onboarding_persona"] == "explorer"

    # Verify persisted in DB
    user_query = select(User).where(User.email == username)
    user_db = db.exec(user_query).first()
    assert user_db
    assert user_db.onboarding_completed is True
    assert user_db.onboarding_persona == "explorer"


def test_update_password_me(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    new_password = random_lower_string()
    data = {
        "current_password": settings.FIRST_SUPERUSER_PASSWORD,
        "new_password": new_password,
    }
    r = client.patch(
        f"{settings.API_V1_STR}/users/me/password",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    updated_user = r.json()
    assert updated_user["message"] == "Password updated successfully"

    user_query = select(User).where(User.email == settings.FIRST_SUPERUSER)
    user_db = db.exec(user_query).first()
    assert user_db
    assert user_db.email == settings.FIRST_SUPERUSER
    verified, _ = verify_password(new_password, user_db.hashed_password)
    assert verified

    # Revert to the old password to keep consistency in test
    old_data = {
        "current_password": new_password,
        "new_password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.patch(
        f"{settings.API_V1_STR}/users/me/password",
        headers=superuser_token_headers,
        json=old_data,
    )
    db.refresh(user_db)

    assert r.status_code == 200
    verified, _ = verify_password(
        settings.FIRST_SUPERUSER_PASSWORD, user_db.hashed_password
    )
    assert verified


def test_update_password_me_incorrect_password(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    new_password = random_lower_string()
    data = {"current_password": new_password, "new_password": new_password}
    r = client.patch(
        f"{settings.API_V1_STR}/users/me/password",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 400
    updated_user = r.json()
    assert updated_user["detail"] == "Incorrect password"


def test_update_user_me_email_resets_email_verified(
    client: TestClient, db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)

    # Mark the user as email-verified
    user.email_verified = True
    db.add(user)
    db.commit()

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    new_email = random_email()
    r = client.patch(
        f"{settings.API_V1_STR}/users/me",
        headers=headers,
        json={"email": new_email},
    )
    assert r.status_code == 200
    assert r.json()["email_verified"] is False

    db.refresh(user)
    assert user.email_verified is False


def test_update_user_me_same_email_keeps_email_verified(
    client: TestClient, db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)

    user.email_verified = True
    db.add(user)
    db.commit()

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # Update only full_name — email unchanged, verified status must be preserved
    r = client.patch(
        f"{settings.API_V1_STR}/users/me",
        headers=headers,
        json={"full_name": "Same Email Update"},
    )
    assert r.status_code == 200
    db.refresh(user)
    assert user.email_verified is True


def test_update_user_me_email_exists(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)

    data = {"email": user.email}
    r = client.patch(
        f"{settings.API_V1_STR}/users/me",
        headers=normal_user_token_headers,
        json=data,
    )
    assert r.status_code == 409
    assert r.json()["detail"] == "User with this email already exists"


def test_update_password_me_same_password_error(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {
        "current_password": settings.FIRST_SUPERUSER_PASSWORD,
        "new_password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.patch(
        f"{settings.API_V1_STR}/users/me/password",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 400
    updated_user = r.json()
    assert (
        updated_user["detail"] == "New password cannot be the same as the current one"
    )


def test_register_user(client: TestClient, db: Session) -> None:
    username = random_email()
    password = random_lower_string()
    full_name = random_lower_string()
    data = {"email": username, "password": password, "full_name": full_name}
    r = client.post(
        f"{settings.API_V1_STR}/users/signup",
        json=data,
    )
    assert r.status_code == 200
    created_user = r.json()
    assert created_user["email"] == username
    assert created_user["full_name"] == full_name

    user_query = select(User).where(User.email == username)
    user_db = db.exec(user_query).first()
    assert user_db
    assert user_db.email == username
    assert user_db.full_name == full_name
    verified, _ = verify_password(password, user_db.hashed_password)
    assert verified


def test_register_user_already_exists_error(client: TestClient) -> None:
    password = random_lower_string()
    full_name = random_lower_string()
    data = {
        "email": settings.FIRST_SUPERUSER,
        "password": password,
        "full_name": full_name,
    }
    r = client.post(
        f"{settings.API_V1_STR}/users/signup",
        json=data,
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "The user with this email already exists in the system"


def test_update_user(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)

    data = {"full_name": "Updated_full_name"}
    r = client.patch(
        f"{settings.API_V1_STR}/users/{user.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    updated_user = r.json()

    assert updated_user["full_name"] == "Updated_full_name"

    user_query = select(User).where(User.email == username)
    user_db = db.exec(user_query).first()
    db.refresh(user_db)
    assert user_db
    assert user_db.full_name == "Updated_full_name"


def test_update_user_not_exists(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"full_name": "Updated_full_name"}
    r = client.patch(
        f"{settings.API_V1_STR}/users/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "The user with this id does not exist in the system"


def test_update_user_email_exists(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)

    username2 = random_email()
    password2 = random_lower_string()
    user_in2 = UserCreate(email=username2, password=password2)
    user2 = crud.create_user(session=db, user_create=user_in2)

    data = {"email": user2.email}
    r = client.patch(
        f"{settings.API_V1_STR}/users/{user.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 409
    assert r.json()["detail"] == "User with this email already exists"


def test_delete_user_me(client: TestClient, db: Session) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    user_id = user.id

    login_data = {
        "username": username,
        "password": password,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}

    r = client.delete(
        f"{settings.API_V1_STR}/users/me",
        headers=headers,
    )
    assert r.status_code == 204
    result = db.exec(select(User).where(User.id == user_id)).first()
    assert result is None

    user_query = select(User).where(User.id == user_id)
    user_db = db.execute(user_query).first()
    assert user_db is None


def test_delete_user_me_blacklists_refresh_token(
    client: TestClient, db: Session
) -> None:
    """Account deletion blacklists the refresh token cookie so it can't be reused."""
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    crud.create_user(session=db, user_create=user_in)

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    a_token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}

    # Simulate a session that also has a refresh token cookie
    fake_refresh_token = "fake.refresh.token"
    client.cookies.set("refresh_token", fake_refresh_token)

    with patch("app.api.routes.users.auth_service.logout") as mock_logout:
        r = client.delete(f"{settings.API_V1_STR}/users/me", headers=headers)
        assert r.status_code == 204
        mock_logout.assert_called_once_with(fake_refresh_token)


def test_delete_user_me_as_superuser(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.delete(
        f"{settings.API_V1_STR}/users/me",
        headers=superuser_token_headers,
    )
    assert r.status_code == 403
    response = r.json()
    assert response["detail"] == "Super users are not allowed to delete themselves"


def test_delete_user_super_user(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)
    user_id = user.id
    r = client.delete(
        f"{settings.API_V1_STR}/users/{user_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 204
    result = db.exec(select(User).where(User.id == user_id)).first()
    assert result is None


def test_delete_user_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.delete(
        f"{settings.API_V1_STR}/users/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert r.json()["detail"] == "User not found"


def test_delete_user_current_super_user_error(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    super_user = crud.get_user_by_email(session=db, email=settings.FIRST_SUPERUSER)
    assert super_user
    user_id = super_user.id

    r = client.delete(
        f"{settings.API_V1_STR}/users/{user_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "Super users are not allowed to delete themselves"


def test_delete_user_without_privileges(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = crud.create_user(session=db, user_create=user_in)

    r = client.delete(
        f"{settings.API_V1_STR}/users/{user.id}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "The user doesn't have enough privileges"


# GDPR Data Export Tests


def test_export_user_data(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,  # noqa: ARG001
) -> None:
    """Test GDPR data export returns all required fields."""
    r = client.get(
        f"{settings.API_V1_STR}/users/me/export",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    export_data = r.json()

    # Verify export metadata
    assert "export_date" in export_data
    assert export_data["export_format_version"] == "1.0"

    # Verify user profile data
    assert "id" in export_data
    assert export_data["email"] == settings.FIRST_SUPERUSER
    assert "full_name" in export_data
    assert "citizenship" in export_data
    assert "is_active" in export_data
    assert "email_verified" in export_data
    assert "subscription_tier" in export_data
    assert "created_at" in export_data


def test_export_user_data_unauthenticated(client: TestClient) -> None:
    """Test that unauthenticated users cannot export data."""
    r = client.get(f"{settings.API_V1_STR}/users/me/export")
    assert r.status_code == 401


def test_export_user_data_normal_user(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test that normal users can export their own data."""
    # First, get the current user info
    user_response = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers=normal_user_token_headers,
    )
    assert user_response.status_code == 200
    current_user = user_response.json()

    # Now get the export
    r = client.get(
        f"{settings.API_V1_STR}/users/me/export",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    export_data = r.json()

    # Verify the export is for the correct user
    assert export_data["email"] == current_user["email"]
    assert export_data["id"] == current_user["id"]
    assert "export_date" in export_data


# Avatar Upload / Delete Tests


def _create_test_image(
    fmt: str = "PNG", size: tuple[int, int] = (100, 100)
) -> io.BytesIO:
    """Create a minimal in-memory image for testing."""
    img = Image.new("RGB", size, color="red")
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf


def test_upload_avatar(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Upload a valid PNG avatar and verify the response."""
    buf = _create_test_image("PNG")
    r = client.put(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("avatar.png", buf, "image/png")},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["avatar_url"].startswith("data:image/webp;base64,")


def test_upload_avatar_jpeg(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Upload a valid JPEG avatar."""
    buf = _create_test_image("JPEG")
    r = client.put(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("avatar.jpg", buf, "image/jpeg")},
    )
    assert r.status_code == 200
    assert r.json()["avatar_url"].startswith("data:image/webp;base64,")


def test_upload_avatar_webp(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Upload a valid WebP avatar."""
    buf = _create_test_image("WEBP")
    r = client.put(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("avatar.webp", buf, "image/webp")},
    )
    assert r.status_code == 200
    assert r.json()["avatar_url"].startswith("data:image/webp;base64,")


def test_upload_avatar_invalid_content_type(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Reject upload when content_type is not an allowed image type."""
    buf = io.BytesIO(b"not an image")
    r = client.put(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("file.txt", buf, "text/plain")},
    )
    assert r.status_code == 400
    assert "Invalid file type" in r.json()["detail"]


def test_upload_avatar_too_large(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Reject files exceeding the 2 MB limit."""
    big = io.BytesIO(b"\x00" * (2 * 1024 * 1024 + 1))
    r = client.put(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("big.png", big, "image/png")},
    )
    assert r.status_code == 400
    assert "File too large" in r.json()["detail"]


def test_upload_avatar_unreadable_image(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Reject files that claim to be images but cannot be decoded."""
    garbage = io.BytesIO(b"not-a-real-image-payload")
    r = client.put(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("bad.png", garbage, "image/png")},
    )
    assert r.status_code == 400
    assert "Cannot read image" in r.json()["detail"]


def test_upload_avatar_invalid_image_format(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Reject images whose actual format doesn't match allowed formats (e.g. BMP)."""
    img = Image.new("RGB", (50, 50), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="BMP")
    buf.seek(0)
    r = client.put(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("avatar.bmp", buf, "image/png")},
    )
    assert r.status_code == 400
    assert "Invalid file type" in r.json()["detail"]


def test_upload_avatar_resizes_large_image(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Uploaded images larger than 256x256 are resized down."""
    buf = _create_test_image("PNG", size=(512, 512))
    r = client.put(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("large.png", buf, "image/png")},
    )
    assert r.status_code == 200
    avatar_url = r.json()["avatar_url"]
    # Decode and verify dimensions
    b64_data = avatar_url.split(",", 1)[1]
    decoded = base64.b64decode(b64_data)
    result_img = Image.open(io.BytesIO(decoded))
    assert result_img.width <= 256
    assert result_img.height <= 256


def test_delete_avatar(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Upload an avatar then delete it — avatar_url should become null."""
    # First upload
    buf = _create_test_image("PNG")
    r = client.put(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("avatar.png", buf, "image/png")},
    )
    assert r.status_code == 200
    assert r.json()["avatar_url"] is not None

    # Delete
    r = client.delete(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 204

    # Verify removed
    r = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["avatar_url"] is None


def test_delete_avatar_when_none(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Deleting an avatar when none is set should still succeed with 204."""
    r = client.delete(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 204


def test_upload_avatar_unauthenticated(client: TestClient) -> None:
    """Unauthenticated requests are rejected."""
    buf = _create_test_image("PNG")
    r = client.put(
        f"{settings.API_V1_STR}/users/me/avatar",
        files={"file": ("avatar.png", buf, "image/png")},
    )
    assert r.status_code == 401


def test_delete_avatar_unauthenticated(client: TestClient) -> None:
    """Unauthenticated delete requests are rejected."""
    r = client.delete(f"{settings.API_V1_STR}/users/me/avatar")
    assert r.status_code == 401


def test_export_includes_avatar_url(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """GDPR export includes the avatar_url field after upload."""
    buf = _create_test_image("PNG")
    r = client.put(
        f"{settings.API_V1_STR}/users/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("avatar.png", buf, "image/png")},
    )
    assert r.status_code == 200

    r = client.get(
        f"{settings.API_V1_STR}/users/me/export",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["avatar_url"].startswith("data:image/webp;base64,")
