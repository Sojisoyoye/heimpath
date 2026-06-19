"""Tests for /viewings endpoints."""

from fastapi.testclient import TestClient

from app.core.config import settings

BASE = f"{settings.API_V1_STR}/viewings"


def _viewing_payload(**overrides) -> dict:
    defaults = {"address": "Musterstraße 1, 10115 Berlin"}
    defaults.update(overrides)
    return defaults


class TestListViewings:
    def test_requires_auth(self, client: TestClient) -> None:
        r = client.get(BASE)
        assert r.status_code == 401

    def test_returns_empty_list(
        self, client: TestClient, normal_user_token_headers: dict
    ) -> None:
        r = client.get(BASE, headers=normal_user_token_headers)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "count" in data


class TestCreateViewing:
    def test_requires_auth(self, client: TestClient) -> None:
        r = client.post(BASE, json=_viewing_payload())
        assert r.status_code == 401

    def test_creates_viewing(
        self, client: TestClient, normal_user_token_headers: dict
    ) -> None:
        r = client.post(
            BASE, json=_viewing_payload(), headers=normal_user_token_headers
        )
        assert r.status_code == 201
        data = r.json()
        assert data["address"] == "Musterstraße 1, 10115 Berlin"
        assert data["checklist_data"] == []
        assert "id" in data

    def test_rejects_empty_address(
        self, client: TestClient, normal_user_token_headers: dict
    ) -> None:
        r = client.post(
            BASE, json={"address": ""}, headers=normal_user_token_headers
        )
        assert r.status_code == 422

    def test_creates_with_viewed_at(
        self, client: TestClient, normal_user_token_headers: dict
    ) -> None:
        r = client.post(
            BASE,
            json=_viewing_payload(viewed_at="2026-06-15"),
            headers=normal_user_token_headers,
        )
        assert r.status_code == 201
        assert r.json()["viewed_at"] == "2026-06-15"


class TestGetViewing:
    def test_requires_auth(self, client: TestClient) -> None:
        r = client.get(f"{BASE}/00000000-0000-0000-0000-000000000001")
        assert r.status_code == 401

    def test_returns_404_for_unknown(
        self, client: TestClient, normal_user_token_headers: dict
    ) -> None:
        r = client.get(
            f"{BASE}/00000000-0000-0000-0000-000000000001",
            headers=normal_user_token_headers,
        )
        assert r.status_code == 404

    def test_returns_viewing(
        self, client: TestClient, normal_user_token_headers: dict
    ) -> None:
        create_r = client.post(
            BASE, json=_viewing_payload(), headers=normal_user_token_headers
        )
        viewing_id = create_r.json()["id"]

        r = client.get(f"{BASE}/{viewing_id}", headers=normal_user_token_headers)
        assert r.status_code == 200
        assert r.json()["id"] == viewing_id


class TestUpdateViewing:
    def test_requires_auth(self, client: TestClient) -> None:
        r = client.patch(
            f"{BASE}/00000000-0000-0000-0000-000000000001", json={"notes": "test"}
        )
        assert r.status_code == 401

    def test_updates_notes(
        self, client: TestClient, normal_user_token_headers: dict
    ) -> None:
        create_r = client.post(
            BASE, json=_viewing_payload(), headers=normal_user_token_headers
        )
        viewing_id = create_r.json()["id"]

        r = client.patch(
            f"{BASE}/{viewing_id}",
            json={"notes": "Looks good, nice neighbourhood"},
            headers=normal_user_token_headers,
        )
        assert r.status_code == 200
        assert r.json()["notes"] == "Looks good, nice neighbourhood"

    def test_updates_checklist_data(
        self, client: TestClient, normal_user_token_headers: dict
    ) -> None:
        create_r = client.post(
            BASE, json=_viewing_payload(), headers=normal_user_token_headers
        )
        viewing_id = create_r.json()["id"]

        checklist = [
            {
                "id": "structure",
                "label": "Structure",
                "items": [
                    {
                        "id": "roof",
                        "label": "Roof condition",
                        "checked": True,
                        "notes": "Looks good",
                    }
                ],
            }
        ]
        r = client.patch(
            f"{BASE}/{viewing_id}",
            json={"checklist_data": checklist},
            headers=normal_user_token_headers,
        )
        assert r.status_code == 200
        assert r.json()["checklist_data"][0]["id"] == "structure"

    def test_returns_404_for_wrong_user(
        self, client: TestClient, normal_user_token_headers: dict
    ) -> None:
        r = client.patch(
            f"{BASE}/00000000-0000-0000-0000-000000000001",
            json={"notes": "hack"},
            headers=normal_user_token_headers,
        )
        assert r.status_code == 404


class TestDeleteViewing:
    def test_requires_auth(self, client: TestClient) -> None:
        r = client.delete(f"{BASE}/00000000-0000-0000-0000-000000000001")
        assert r.status_code == 401

    def test_deletes_viewing(
        self, client: TestClient, normal_user_token_headers: dict
    ) -> None:
        create_r = client.post(
            BASE, json=_viewing_payload(), headers=normal_user_token_headers
        )
        viewing_id = create_r.json()["id"]

        r = client.delete(f"{BASE}/{viewing_id}", headers=normal_user_token_headers)
        assert r.status_code == 204

        get_r = client.get(f"{BASE}/{viewing_id}", headers=normal_user_token_headers)
        assert get_r.status_code == 404

    def test_returns_404_for_wrong_user(
        self, client: TestClient, normal_user_token_headers: dict
    ) -> None:
        r = client.delete(
            f"{BASE}/00000000-0000-0000-0000-000000000001",
            headers=normal_user_token_headers,
        )
        assert r.status_code == 404
