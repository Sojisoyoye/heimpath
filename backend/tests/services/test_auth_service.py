"""Tests for JWT authentication service module-level functions."""

import uuid
from datetime import datetime, timedelta, timezone

import fakeredis
import jwt
import pytest

from app.services.auth_service import (
    ALGORITHM,
    TokenData,
    TokenType,
    blacklist_token,
    create_access_token,
    create_refresh_token,
    decode_token,
    is_token_blacklisted,
    logout,
    refresh_access_token,
    verify_token,
)


@pytest.fixture(autouse=True)
def fake_redis_client(monkeypatch: pytest.MonkeyPatch) -> fakeredis.FakeRedis:
    """Replace the Redis client with an isolated in-memory fake for every test."""
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr("app.services.auth_service._redis_client", fake)
    return fake


# ── TokenType ─────────────────────────────────────────────────────────────────


class TestTokenType:
    def test_values(self) -> None:
        assert TokenType.ACCESS.value == "access"
        assert TokenType.REFRESH.value == "refresh"


# ── TokenData ─────────────────────────────────────────────────────────────────


class TestTokenData:
    def test_creation(self) -> None:
        user_id = uuid.uuid4()
        td = TokenData(
            sub=str(user_id),
            type=TokenType.ACCESS,
            exp=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        assert td.sub == str(user_id)
        assert td.type == TokenType.ACCESS

    def test_with_jti(self) -> None:
        td = TokenData(
            sub="user-id",
            type=TokenType.REFRESH,
            exp=datetime.now(timezone.utc) + timedelta(days=7),
            jti="unique-token-id",
        )
        assert td.jti == "unique-token-id"


# ── create_access_token ───────────────────────────────────────────────────────


class TestCreateAccessToken:
    def test_returns_string(self) -> None:
        token = create_access_token(subject=str(uuid.uuid4()))
        assert isinstance(token, str) and len(token) > 0

    def test_default_expiry_24h(self) -> None:
        token = create_access_token(subject=str(uuid.uuid4()))
        payload = decode_token(token)
        assert payload is not None
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        diff = exp - datetime.now(timezone.utc)
        assert timedelta(hours=23) < diff < timedelta(hours=25)

    def test_custom_expiry(self) -> None:
        token = create_access_token(
            subject=str(uuid.uuid4()), expires_delta=timedelta(hours=2)
        )
        payload = decode_token(token)
        assert payload is not None
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        diff = exp - datetime.now(timezone.utc)
        assert timedelta(hours=1, minutes=59) < diff < timedelta(hours=2, minutes=1)

    def test_remember_me_30d(self) -> None:
        token = create_access_token(subject=str(uuid.uuid4()), remember_me=True)
        payload = decode_token(token)
        assert payload is not None
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        diff = exp - datetime.now(timezone.utc)
        assert timedelta(days=29) < diff < timedelta(days=31)

    def test_type_claim_is_access(self) -> None:
        payload = decode_token(create_access_token(subject=str(uuid.uuid4())))
        assert payload is not None
        assert payload["type"] == TokenType.ACCESS.value


# ── create_refresh_token ──────────────────────────────────────────────────────


class TestCreateRefreshToken:
    def test_type_claim_is_refresh(self) -> None:
        payload = decode_token(create_refresh_token(subject=str(uuid.uuid4())))
        assert payload is not None
        assert payload["type"] == TokenType.REFRESH.value

    def test_default_expiry_7d(self) -> None:
        payload = decode_token(create_refresh_token(subject=str(uuid.uuid4())))
        assert payload is not None
        exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        diff = exp - datetime.now(timezone.utc)
        assert timedelta(days=6) < diff < timedelta(days=8)

    def test_has_jti(self) -> None:
        payload = decode_token(create_refresh_token(subject=str(uuid.uuid4())))
        assert payload is not None
        assert "jti" in payload and payload["jti"]


# ── decode_token ──────────────────────────────────────────────────────────────


class TestDecodeToken:
    def test_valid_token(self) -> None:
        user_id = str(uuid.uuid4())
        payload = decode_token(create_access_token(subject=user_id))
        assert payload is not None
        assert payload["sub"] == user_id

    def test_invalid_token_returns_none(self) -> None:
        assert decode_token("not.a.valid.token") is None

    def test_expired_token_returns_none(self) -> None:
        token = create_access_token(
            subject=str(uuid.uuid4()), expires_delta=timedelta(seconds=-1)
        )
        assert decode_token(token) is None

    def test_wrong_secret_returns_none(self) -> None:
        # Forge a token with a different secret
        bad_token = jwt.encode(
            {
                "sub": "x",
                "type": "access",
                "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            },
            "wrong-secret",
            algorithm=ALGORITHM,
        )
        assert decode_token(bad_token) is None


# ── verify_token ──────────────────────────────────────────────────────────────


class TestVerifyToken:
    def test_valid_access_token(self) -> None:
        user_id = str(uuid.uuid4())
        td = verify_token(create_access_token(subject=user_id))
        assert td is not None
        assert td.sub == user_id
        assert td.type == TokenType.ACCESS

    def test_invalid_token_returns_none(self) -> None:
        assert verify_token("invalid.token") is None

    def test_blacklisted_token_returns_none(self) -> None:
        refresh = create_refresh_token(subject=str(uuid.uuid4()))
        payload = decode_token(refresh)
        assert payload is not None
        jti = payload["jti"]
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        blacklist_token(jti, expires_at)
        assert verify_token(refresh) is None


# ── blacklist / is_blacklisted ────────────────────────────────────────────────


class TestBlacklist:
    def test_blacklisted_token_is_detected(self) -> None:
        refresh = create_refresh_token(subject=str(uuid.uuid4()))
        payload = decode_token(refresh)
        assert payload is not None
        jti = payload["jti"]
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

        assert not is_token_blacklisted(jti)
        blacklist_token(jti, expires_at)
        assert is_token_blacklisted(jti)

    def test_unknown_jti_not_blacklisted(self) -> None:
        assert not is_token_blacklisted("never-seen-jti")


# ── refresh_access_token ──────────────────────────────────────────────────────


class TestRefreshAccessToken:
    def test_issues_new_access_token(self) -> None:
        user_id = str(uuid.uuid4())
        refresh = create_refresh_token(subject=user_id)
        new_access = refresh_access_token(refresh)
        assert new_access is not None
        payload = decode_token(new_access)
        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["type"] == TokenType.ACCESS.value

    def test_invalid_refresh_returns_none(self) -> None:
        assert refresh_access_token("invalid.refresh.token") is None

    def test_access_token_rejected_for_refresh(self) -> None:
        access = create_access_token(subject=str(uuid.uuid4()))
        assert refresh_access_token(access) is None

    def test_blacklisted_refresh_returns_none(self) -> None:
        refresh = create_refresh_token(subject=str(uuid.uuid4()))
        payload = decode_token(refresh)
        assert payload is not None
        blacklist_token(
            payload["jti"],
            datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
        assert refresh_access_token(refresh) is None


# ── logout ────────────────────────────────────────────────────────────────────


class TestLogout:
    def test_blacklists_refresh_token(self) -> None:
        refresh = create_refresh_token(subject=str(uuid.uuid4()))
        payload = decode_token(refresh)
        assert payload is not None
        jti = payload["jti"]

        result = logout(refresh)

        assert result is True
        assert is_token_blacklisted(jti)

    def test_invalid_token_returns_false(self) -> None:
        assert logout("invalid.token") is False

    def test_second_refresh_after_logout_fails(self) -> None:
        refresh = create_refresh_token(subject=str(uuid.uuid4()))
        logout(refresh)
        assert refresh_access_token(refresh) is None
