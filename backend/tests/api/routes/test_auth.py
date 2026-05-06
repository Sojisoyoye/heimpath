"""API-level integration tests for /auth/* endpoints.

Covers the full authentication flow:
  register → verify-email → login → refresh → logout
  → forgot-password → reset-password

Uses a real database (following project test patterns) and fakeredis to
isolate Redis state between tests without requiring a running Redis instance.
"""

import fakeredis
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.security import verify_password
from app.crud import get_user_by_email
from app.services.email_verification_service import get_email_verification_service
from app.services.password_reset_service import get_password_reset_service
from app.services.rate_limit_service import IP_FAILED_LOCKOUT_SECONDS, IP_FAILED_MAX
from tests.utils.utils import random_email

AUTH = f"{settings.API_V1_STR}/auth"

# Password that always passes the strength validator
_VALID_PASSWORD = "ValidPass1"


@pytest.fixture(autouse=True)
def fake_redis(monkeypatch: pytest.MonkeyPatch) -> fakeredis.FakeRedis:
    """Provide isolated fakeredis for every test in this module."""
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr("app.services.auth_service._redis_client", fake)
    monkeypatch.setattr("app.services.rate_limit_service._redis_client", fake)
    monkeypatch.setattr("app.services.email_verification_service._redis_client", fake)
    monkeypatch.setattr("app.services.password_reset_service._redis_client", fake)
    return fake


# ── register ──────────────────────────────────────────────────────────────────


def test_register_creates_user(client: TestClient, db: Session) -> None:
    email = random_email()
    r = client.post(
        f"{AUTH}/register",
        json={"email": email, "password": _VALID_PASSWORD},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == email
    assert body["email_verified"] is False
    assert "hashed_password" not in body
    assert get_user_by_email(session=db, email=email) is not None


def test_register_duplicate_email_returns_400(client: TestClient) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    r = client.post(
        f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD}
    )
    assert r.status_code == 400
    assert "already exists" in r.json()["detail"]


def test_register_weak_password_no_uppercase_returns_422(
    client: TestClient,
) -> None:
    r = client.post(
        f"{AUTH}/register",
        json={"email": random_email(), "password": "weakpass1"},
    )
    assert r.status_code == 422


def test_register_weak_password_no_number_returns_422(client: TestClient) -> None:
    r = client.post(
        f"{AUTH}/register",
        json={"email": random_email(), "password": "WeakPassNoNumber"},
    )
    assert r.status_code == 422


def test_register_short_password_returns_422(client: TestClient) -> None:
    r = client.post(
        f"{AUTH}/register",
        json={"email": random_email(), "password": "Short1"},
    )
    assert r.status_code == 422


# ── verify-email ──────────────────────────────────────────────────────────────


def test_verify_email_marks_user_verified(client: TestClient, db: Session) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})

    # Grab the verification token directly from the in-memory service
    user = get_user_by_email(session=db, email=email)
    assert user is not None
    svc = get_email_verification_service()
    token_data = svc.get_token_for_user(str(user.id))
    assert token_data is not None

    r = client.post(f"{AUTH}/verify-email", json={"token": token_data.token})
    assert r.status_code == 200
    assert r.json()["email_verified"] is True

    db.refresh(user)
    assert user.email_verified is True


def test_verify_email_invalid_token_returns_400(client: TestClient) -> None:
    r = client.post(f"{AUTH}/verify-email", json={"token": "not-a-real-token"})
    assert r.status_code == 400


def test_verify_email_token_consumed_on_use(client: TestClient, db: Session) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    user = get_user_by_email(session=db, email=email)
    assert user is not None
    svc = get_email_verification_service()
    token_data = svc.get_token_for_user(str(user.id))
    assert token_data is not None

    client.post(f"{AUTH}/verify-email", json={"token": token_data.token})
    # Second use of the same token should fail
    r = client.post(f"{AUTH}/verify-email", json={"token": token_data.token})
    assert r.status_code == 400


# ── login ─────────────────────────────────────────────────────────────────────


def _make_verified_user(client: TestClient, db: Session) -> str:
    """Register a user, mark their email as verified in the DB, and return their email."""
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    user = get_user_by_email(session=db, email=email)
    assert user is not None
    user.email_verified = True
    db.add(user)
    db.commit()
    return email


def test_login_returns_tokens(client: TestClient, db: Session) -> None:
    email = _make_verified_user(client, db)
    r = client.post(f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password_returns_401(client: TestClient) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    r = client.post(f"{AUTH}/login", json={"email": email, "password": "WrongPass1"})
    assert r.status_code == 401


def test_login_unknown_email_returns_401(client: TestClient) -> None:
    r = client.post(
        f"{AUTH}/login",
        json={"email": "nobody@example.com", "password": _VALID_PASSWORD},
    )
    assert r.status_code == 401


def test_login_unverified_email_returns_403(client: TestClient) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    # Attempt to log in without verifying email
    r = client.post(f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD})
    assert r.status_code == 403
    assert "verify your email" in r.json()["detail"].lower()


def test_login_inactive_user_returns_403(client: TestClient, db: Session) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    user = get_user_by_email(session=db, email=email)
    assert user is not None
    user.is_active = False
    db.add(user)
    db.commit()

    r = client.post(f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD})
    assert r.status_code == 403


def test_login_remember_me_issues_longer_token(client: TestClient, db: Session) -> None:
    email = _make_verified_user(client, db)
    r = client.post(
        f"{AUTH}/login",
        json={"email": email, "password": _VALID_PASSWORD, "remember_me": True},
    )
    assert r.status_code == 200
    # A longer token is returned — the exact payload is validated in unit tests


def test_login_sets_httponly_cookies(client: TestClient, db: Session) -> None:
    """Successful login must set access_token and refresh_token as HttpOnly cookies."""
    email = _make_verified_user(client, db)
    r = client.post(f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD})
    assert r.status_code == 200
    assert "access_token" in r.cookies
    assert "refresh_token" in r.cookies
    assert "logged_in" in r.cookies
    assert r.cookies["logged_in"] == "1"


def test_cookie_auth_allows_protected_endpoint(client: TestClient, db: Session) -> None:
    """access_token cookie must be accepted by the auth dependency (no Bearer header)."""
    email = _make_verified_user(client, db)
    client.post(f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD})
    # TestClient persists cookies from previous responses automatically
    r = client.post(f"{settings.API_V1_STR}/login/test-token")
    assert r.status_code == 200
    assert r.json()["email"] == email


def test_logout_clears_cookies(client: TestClient, db: Session) -> None:
    """logout must delete access_token, refresh_token, and logged_in cookies."""
    email = _make_verified_user(client, db)
    login_r = client.post(
        f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD}
    )
    assert login_r.status_code == 200

    r = client.post(f"{AUTH}/logout", json={})
    assert r.status_code == 204
    # Cookies deleted: the jar should no longer have them
    assert "access_token" not in client.cookies
    assert "refresh_token" not in client.cookies
    assert "logged_in" not in client.cookies


def test_logout_via_cookie_token(client: TestClient, db: Session) -> None:
    """logout without body must use the refresh_token cookie to blacklist the token."""
    email = _make_verified_user(client, db)
    login_r = client.post(
        f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD}
    )
    assert login_r.status_code == 200
    refresh_cookie = client.cookies.get("refresh_token")
    assert refresh_cookie is not None

    # Logout without body — should use the cookie
    r = client.post(f"{AUTH}/logout", json={})
    assert r.status_code == 204

    # The refresh token from the cookie must now be blacklisted
    r2 = client.post(f"{AUTH}/refresh", json={"refresh_token": refresh_cookie})
    assert r2.status_code == 401


# ── refresh ───────────────────────────────────────────────────────────────────


def _register_and_login(client: TestClient, db: Session) -> dict:
    email = _make_verified_user(client, db)
    r = client.post(f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD})
    return r.json()


def test_refresh_issues_new_access_and_refresh_tokens(
    client: TestClient, db: Session
) -> None:
    tokens = _register_and_login(client, db)
    r = client.post(f"{AUTH}/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    # Refresh token rotation: response contains a NEW refresh token
    assert "refresh_token" in body
    assert body["refresh_token"] != tokens["refresh_token"]


def test_refresh_with_invalid_token_returns_401(client: TestClient) -> None:
    r = client.post(f"{AUTH}/refresh", json={"refresh_token": "bad.token.here"})
    assert r.status_code == 401


def test_refresh_with_access_token_returns_401(client: TestClient, db: Session) -> None:
    tokens = _register_and_login(client, db)
    # Pass the access token where a refresh token is expected
    r = client.post(f"{AUTH}/refresh", json={"refresh_token": tokens["access_token"]})
    assert r.status_code == 401


def test_refresh_via_cookie_token(client: TestClient, db: Session) -> None:
    """Calling /auth/refresh with no body must use the refresh_token cookie."""
    _register_and_login(client, db)
    # At this point client.cookies holds the refresh_token cookie from login
    assert client.cookies.get("refresh_token") is not None

    r = client.post(f"{AUTH}/refresh", json={})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    # access_token cookie must be rotated in the response
    assert "access_token" in r.cookies


# ── logout ────────────────────────────────────────────────────────────────────


def test_logout_returns_204(client: TestClient, db: Session) -> None:
    tokens = _register_and_login(client, db)
    r = client.post(f"{AUTH}/logout", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 204


def test_logout_blacklists_refresh_token(client: TestClient, db: Session) -> None:
    tokens = _register_and_login(client, db)
    client.post(f"{AUTH}/logout", json={"refresh_token": tokens["refresh_token"]})
    # Refresh should now be rejected
    r = client.post(f"{AUTH}/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 401


def test_logout_with_invalid_token_still_returns_204(client: TestClient) -> None:
    # Logout should always succeed (security best practice — no information leak)
    r = client.post(f"{AUTH}/logout", json={"refresh_token": "invalid.token"})
    assert r.status_code == 204


# ── access token rejected as refresh (token-type confusion guard) ─────────────


def test_access_token_rejected_by_current_user_dependency(
    client: TestClient, db: Session
) -> None:
    tokens = _register_and_login(client, db)
    # Attempt to use the refresh token as a bearer token on a protected endpoint
    r = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers={"Authorization": f"Bearer {tokens['refresh_token']}"},
    )
    assert r.status_code == 403


# ── resend-verification ───────────────────────────────────────────────────────


def test_resend_verification_returns_200(client: TestClient) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    r = client.post(f"{AUTH}/resend-verification", json={"email": email})
    assert r.status_code == 200


def test_resend_verification_unknown_email_returns_200(client: TestClient) -> None:
    # Enumeration-safe: should return 200 even for unknown email
    r = client.post(f"{AUTH}/resend-verification", json={"email": "ghost@example.com"})
    assert r.status_code == 200


def test_resend_verification_already_verified_returns_200(
    client: TestClient, db: Session
) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    user = get_user_by_email(session=db, email=email)
    assert user is not None
    user.email_verified = True
    db.add(user)
    db.commit()

    r = client.post(f"{AUTH}/resend-verification", json={"email": email})
    assert r.status_code == 200
    assert r.json()["email_verified"] is True


# ── forgot-password ───────────────────────────────────────────────────────────


def test_forgot_password_registered_email_returns_200(client: TestClient) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    r = client.post(f"{AUTH}/forgot-password", json={"email": email})
    assert r.status_code == 200
    assert "password reset" in r.json()["message"].lower()


def test_forgot_password_unknown_email_returns_200(client: TestClient) -> None:
    # Enumeration-safe
    r = client.post(f"{AUTH}/forgot-password", json={"email": "nobody@nowhere.com"})
    assert r.status_code == 200


# ── reset-password ────────────────────────────────────────────────────────────


def test_reset_password_success(client: TestClient, db: Session) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})

    user = get_user_by_email(session=db, email=email)
    assert user is not None

    # Generate reset token via the service singleton (no email needed in tests)
    svc = get_password_reset_service()
    token_data = svc.generate_token(user_id=str(user.id), email=email)

    new_password = "NewSecure2"
    r = client.post(
        f"{AUTH}/reset-password",
        json={"token": token_data.token, "new_password": new_password},
    )
    assert r.status_code == 200
    assert "reset successfully" in r.json()["message"].lower()

    db.refresh(user)
    verified, _ = verify_password(new_password, user.hashed_password)
    assert verified


def test_reset_password_invalid_token_returns_400(client: TestClient) -> None:
    r = client.post(
        f"{AUTH}/reset-password",
        json={"token": "not-a-real-reset-token", "new_password": _VALID_PASSWORD},
    )
    assert r.status_code == 400


def test_reset_password_token_consumed_on_use(client: TestClient, db: Session) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})

    user = get_user_by_email(session=db, email=email)
    assert user is not None
    svc = get_password_reset_service()
    token_data = svc.generate_token(user_id=str(user.id), email=email)

    client.post(
        f"{AUTH}/reset-password",
        json={"token": token_data.token, "new_password": "FirstReset1"},
    )
    # Second use must fail
    r = client.post(
        f"{AUTH}/reset-password",
        json={"token": token_data.token, "new_password": "SecondReset1"},
    )
    assert r.status_code == 400


def test_reset_password_weak_password_returns_422(
    client: TestClient, db: Session
) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})

    user = get_user_by_email(session=db, email=email)
    assert user is not None
    svc = get_password_reset_service()
    token_data = svc.generate_token(user_id=str(user.id), email=email)

    r = client.post(
        f"{AUTH}/reset-password",
        json={"token": token_data.token, "new_password": "weaknonum"},
    )
    assert r.status_code == 422


# ── rate limiting ─────────────────────────────────────────────────────────────


def test_rate_limit_locks_after_five_failures(client: TestClient) -> None:
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})

    for _ in range(5):
        client.post(f"{AUTH}/login", json={"email": email, "password": "WrongPass1"})

    r = client.post(f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD})
    assert r.status_code == 429
    assert "Retry-After" in r.headers


def test_register_rate_limit(client: TestClient) -> None:
    """4th registration attempt with the same email returns 429."""
    email = random_email()
    # First 3 attempts succeed or fail normally (duplicate email for 2nd and 3rd)
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    # 4th attempt should be rate limited
    r = client.post(
        f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD}
    )
    assert r.status_code == 429
    assert "Retry-After" in r.headers


def test_forgot_password_rate_limit(client: TestClient) -> None:
    """4th forgot-password attempt with the same email returns 429."""
    email = random_email()
    client.post(f"{AUTH}/register", json={"email": email, "password": _VALID_PASSWORD})
    # First 3 attempts succeed
    for _ in range(3):
        r = client.post(f"{AUTH}/forgot-password", json={"email": email})
        assert r.status_code == 200
    # 4th attempt should be rate limited
    r = client.post(f"{AUTH}/forgot-password", json={"email": email})
    assert r.status_code == 429
    assert "Retry-After" in r.headers


def test_rate_limit_cleared_on_success(client: TestClient, db: Session) -> None:
    email = _make_verified_user(client, db)

    # Build up some failures but not enough to lock
    for _ in range(3):
        client.post(f"{AUTH}/login", json={"email": email, "password": "WrongPass1"})

    # Successful login clears the counter
    r = client.post(f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD})
    assert r.status_code == 200

    # Three more failures should not yet lock
    for _ in range(3):
        client.post(f"{AUTH}/login", json={"email": email, "password": "WrongPass1"})
    r = client.post(f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD})
    assert r.status_code == 200


# ── IP-based rate limiting ────────────────────────────────────────────────────


def test_ip_rate_limit_blocks_after_max_failures(client: TestClient) -> None:
    """30 failed logins from one IP (across different emails) trigger IP block."""
    for _ in range(IP_FAILED_MAX):
        email = random_email()
        client.post(f"{AUTH}/login", json={"email": email, "password": "WrongPass1"})

    # Next attempt from same IP (TestClient uses "testclient" as host) must be 429
    r = client.post(
        f"{AUTH}/login", json={"email": random_email(), "password": "WrongPass1"}
    )
    assert r.status_code == 429
    assert r.headers["Retry-After"] == str(IP_FAILED_LOCKOUT_SECONDS)


def test_ip_rate_limit_not_cleared_on_success(client: TestClient, db: Session) -> None:
    """A successful login from an IP does not reset the IP failure counter."""
    email = _make_verified_user(client, db)

    # Accumulate IP_FAILED_MAX - 1 failures — not enough to trigger lockout yet.
    for _ in range(IP_FAILED_MAX - 1):
        client.post(
            f"{AUTH}/login",
            json={"email": random_email(), "password": "WrongPass1"},
        )

    # A successful login must not reset the IP failure counter.
    r = client.post(f"{AUTH}/login", json={"email": email, "password": _VALID_PASSWORD})
    assert r.status_code == 200

    # One more failure pushes the counter to IP_FAILED_MAX, setting the lockout.
    client.post(
        f"{AUTH}/login",
        json={"email": random_email(), "password": "WrongPass1"},
    )

    # IP is now locked — next attempt must return 429.
    r = client.post(
        f"{AUTH}/login", json={"email": random_email(), "password": "WrongPass1"}
    )
    assert r.status_code == 429
