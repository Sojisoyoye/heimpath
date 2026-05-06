from unittest.mock import patch

import fakeredis
import pytest
from fastapi.testclient import TestClient
from pwdlib.hashers.bcrypt import BcryptHasher
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.crud import create_user
from app.models import User, UserCreate
from app.services.rate_limit_service import IP_FAILED_LOCKOUT_SECONDS, IP_FAILED_MAX
from app.utils import generate_password_reset_token
from tests.utils.user import user_authentication_headers
from tests.utils.utils import random_email, random_lower_string


@pytest.fixture()
def isolated_rate_limiter(monkeypatch: pytest.MonkeyPatch) -> fakeredis.FakeRedis:
    """Provide isolated fakeredis for rate-limit tests in this module."""
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr("app.services.rate_limit_service._redis_client", fake)
    return fake


def test_get_access_token(client: TestClient) -> None:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    assert r.status_code == 200
    assert "access_token" in tokens
    assert tokens["access_token"]


def test_get_access_token_incorrect_password(client: TestClient) -> None:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": "incorrect",
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 400


def test_login_access_token_unverified_email_returns_403(
    client: TestClient, db: Session
) -> None:
    email = random_email()
    password = random_lower_string()
    password_hash = get_password_hash(password)
    user = User(email=email, hashed_password=password_hash, is_active=True)
    db.add(user)
    db.commit()

    r = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": email, "password": password},
    )
    assert r.status_code == 403
    assert "verify your email" in r.json()["detail"].lower()


def test_use_access_token(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers=superuser_token_headers,
    )
    result = r.json()
    assert r.status_code == 200
    assert "email" in result


def test_recovery_password(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    with (
        patch("app.core.config.settings.SMTP_HOST", "smtp.example.com"),
        patch("app.core.config.settings.SMTP_USER", "admin@example.com"),
    ):
        r = client.post(
            f"{settings.API_V1_STR}/password-recovery",
            headers=normal_user_token_headers,
            json={"email": "test@example.com"},
        )
        assert r.status_code == 200
        assert r.json() == {
            "message": "If that email is registered, we sent a password recovery link"
        }


def test_recovery_password_user_not_exits(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/password-recovery",
        headers=normal_user_token_headers,
        json={"email": "jVgQr@example.com"},
    )
    # Should return 200 with generic message to prevent email enumeration attacks
    assert r.status_code == 200
    assert r.json() == {
        "message": "If that email is registered, we sent a password recovery link"
    }


def test_reset_password(client: TestClient, db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    new_password = random_lower_string()

    user_create = UserCreate(
        email=email,
        full_name="Test User",
        password=password,
        is_active=True,
        is_superuser=False,
    )
    user = create_user(session=db, user_create=user_create)
    token = generate_password_reset_token(email=email)
    headers = user_authentication_headers(client=client, email=email, password=password)
    data = {"new_password": new_password, "token": token}

    r = client.post(
        f"{settings.API_V1_STR}/reset-password/",
        headers=headers,
        json=data,
    )

    assert r.status_code == 200
    assert r.json() == {"message": "Password updated successfully"}

    db.refresh(user)
    verified, _ = verify_password(new_password, user.hashed_password)
    assert verified


def test_reset_password_invalid_token(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"new_password": "changethis", "token": "invalid"}
    r = client.post(
        f"{settings.API_V1_STR}/reset-password/",
        headers=superuser_token_headers,
        json=data,
    )
    response = r.json()

    assert "detail" in response
    assert r.status_code == 400
    assert response["detail"] == "Invalid token"


def test_login_with_bcrypt_password_upgrades_to_argon2(
    client: TestClient, db: Session
) -> None:
    """Test that logging in with a bcrypt password hash upgrades it to argon2."""
    email = random_email()
    password = random_lower_string()

    # Create a bcrypt hash directly (simulating legacy password)
    bcrypt_hasher = BcryptHasher()
    bcrypt_hash = bcrypt_hasher.hash(password)
    assert bcrypt_hash.startswith("$2")  # bcrypt hashes start with $2

    user = User(
        email=email, hashed_password=bcrypt_hash, is_active=True, email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    assert user.hashed_password.startswith("$2")

    login_data = {"username": email, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200
    tokens = r.json()
    assert "access_token" in tokens

    db.refresh(user)

    # Verify the hash was upgraded to argon2
    assert user.hashed_password.startswith("$argon2")

    verified, updated_hash = verify_password(password, user.hashed_password)
    assert verified
    # Should not need another update since it's already argon2
    assert updated_hash is None


def test_login_with_argon2_password_keeps_hash(client: TestClient, db: Session) -> None:
    """Test that logging in with an argon2 password hash does not update it."""
    email = random_email()
    password = random_lower_string()

    # Create an argon2 hash (current default)
    argon2_hash = get_password_hash(password)
    assert argon2_hash.startswith("$argon2")

    # Create user with argon2 hash
    user = User(
        email=email, hashed_password=argon2_hash, is_active=True, email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    original_hash = user.hashed_password

    login_data = {"username": email, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200
    tokens = r.json()
    assert "access_token" in tokens

    db.refresh(user)

    assert user.hashed_password == original_hash
    assert user.hashed_password.startswith("$argon2")


def test_legacy_login_rate_limit_locks_after_5_failures(
    client: TestClient,
    isolated_rate_limiter: fakeredis.FakeRedis,  # noqa: ARG001
) -> None:
    """After 5 failed attempts the legacy endpoint returns 429."""
    bad_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": "wrong-password-1",
    }
    for _ in range(5):
        r = client.post(f"{settings.API_V1_STR}/login/access-token", data=bad_data)
        assert r.status_code == 400

    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=bad_data)
    assert r.status_code == 429
    assert "Retry-After" in r.headers


def test_legacy_login_rate_limit_cleared_on_success(
    client: TestClient,
    isolated_rate_limiter: fakeredis.FakeRedis,  # noqa: ARG001
) -> None:
    """A successful login clears the failure counter."""
    bad_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": "wrong-password-1",
    }
    for _ in range(3):
        client.post(f"{settings.API_V1_STR}/login/access-token", data=bad_data)

    good_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=good_data)
    assert r.status_code == 200

    # Counter cleared — 5 more failures should be allowed before lock
    for _ in range(5):
        r = client.post(f"{settings.API_V1_STR}/login/access-token", data=bad_data)
        assert r.status_code == 400


def test_legacy_login_ip_rate_limit_blocks_after_max_failures(
    client: TestClient,
    isolated_rate_limiter: fakeredis.FakeRedis,  # noqa: ARG001
) -> None:
    """After IP_FAILED_MAX failures from one IP the legacy endpoint returns 429."""
    # Use non-existent emails so each attempt hits auth and increments IP counter.
    # The lock is set on the IP_FAILED_MAX-th attempt but that request still returns
    # 400; the *next* request after the lock is set returns 429.
    for _ in range(IP_FAILED_MAX):
        r = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": random_email(), "password": "wrong"},
        )
        assert r.status_code == 400

    r = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": random_email(), "password": "wrong"},
    )
    assert r.status_code == 429
    assert r.headers["Retry-After"] == str(IP_FAILED_LOCKOUT_SECONDS)


# ── L3: password-recovery-html-content enumeration fix ───────────────────────


def test_password_recovery_html_unknown_email_returns_200(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """L3: unknown email must not leak existence via 404 — must return 200."""
    r = client.post(
        f"{settings.API_V1_STR}/password-recovery-html-content",
        headers=superuser_token_headers,
        json={"email": "nonexistent-l3@example.com"},
    )
    assert r.status_code == 200
    assert "No account is registered" in r.text


def test_password_recovery_html_known_email_returns_html(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Known email returns 200 with the rendered password reset email HTML."""
    email = random_email()
    password = random_lower_string()
    create_user(session=db, user_create=UserCreate(email=email, password=password))

    r = client.post(
        f"{settings.API_V1_STR}/password-recovery-html-content",
        headers=superuser_token_headers,
        json={"email": email},
    )
    assert r.status_code == 200
    # Response must contain email template HTML, not the generic fallback
    assert "reset" in r.text.lower() or email in r.text
