"""Integration tests for ownership comparison endpoints."""

import uuid

from fastapi.testclient import TestClient

from app.core.config import settings

BASE = f"{settings.API_V1_STR}/calculators/ownership-comparison"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _save_comparison(
    client: TestClient, headers: dict[str, str], **overrides: object
) -> dict:
    """Save a comparison and return the response JSON."""
    r = client.post(
        f"{BASE}",
        json=_calculate_payload(**overrides),
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


def _calculate_payload(**overrides) -> dict:
    """Return a valid POST body for the /calculate endpoint."""
    defaults = {
        "num_properties": 3,
        "annual_rental_income": 60_000.0,
        "personal_marginal_tax_rate": 42.0,
        "annual_appreciation": 3.0,
        "holding_period": 15,
        "total_property_value": 1_000_000.0,
    }
    defaults.update(overrides)
    return defaults


# ---------------------------------------------------------------------------
# POST /ownership-comparison/calculate
# ---------------------------------------------------------------------------


class TestCalculateEndpoint:
    """Tests for the /calculate endpoint (no auth)."""

    def test_returns_200(self, client: TestClient) -> None:
        r = client.post(f"{BASE}/calculate", json=_calculate_payload())
        assert r.status_code == 200

    def test_response_contains_both_scenarios(self, client: TestClient) -> None:
        r = client.post(f"{BASE}/calculate", json=_calculate_payload())
        data = r.json()
        assert "private" in data
        assert "gmbh" in data
        assert "breakeven_year" in data
        assert "gmbh_advantage_at_exit" in data
        assert "recommendation" in data

    def test_scenario_has_expected_keys(self, client: TestClient) -> None:
        r = client.post(f"{BASE}/calculate", json=_calculate_payload())
        data = r.json()
        for scenario in ("private", "gmbh"):
            assert "effective_tax_rate" in data[scenario]
            assert "year1_tax" in data[scenario]
            assert "total_wealth" in data[scenario]
            assert "projections" in data[scenario]
            assert "capital_gains_tax" in data[scenario]

    def test_projections_count(self, client: TestClient) -> None:
        r = client.post(f"{BASE}/calculate", json=_calculate_payload())
        data = r.json()
        assert len(data["private"]["projections"]) == 15
        assert len(data["gmbh"]["projections"]) == 15

    def test_rejects_zero_rental_income(self, client: TestClient) -> None:
        r = client.post(
            f"{BASE}/calculate",
            json=_calculate_payload(annual_rental_income=0),
        )
        assert r.status_code == 422

    def test_rejects_negative_property_value(self, client: TestClient) -> None:
        r = client.post(
            f"{BASE}/calculate",
            json=_calculate_payload(total_property_value=-100_000),
        )
        assert r.status_code == 422

    def test_rejects_holding_period_over_30(self, client: TestClient) -> None:
        r = client.post(
            f"{BASE}/calculate",
            json=_calculate_payload(holding_period=31),
        )
        assert r.status_code == 422

    def test_rejects_tax_rate_over_45(self, client: TestClient) -> None:
        r = client.post(
            f"{BASE}/calculate",
            json=_calculate_payload(personal_marginal_tax_rate=50),
        )
        assert r.status_code == 422

    def test_defaults_work_with_minimal_input(self, client: TestClient) -> None:
        """Advanced fields should use defaults."""
        minimal = {
            "num_properties": 1,
            "annual_rental_income": 24_000.0,
            "personal_marginal_tax_rate": 30.0,
            "annual_appreciation": 2.0,
            "holding_period": 10,
            "total_property_value": 400_000.0,
        }
        r = client.post(f"{BASE}/calculate", json=minimal)
        assert r.status_code == 200
        data = r.json()
        assert data["private"]["total_wealth"] > 0

    def test_high_income_favors_gmbh(self, client: TestClient) -> None:
        r = client.post(
            f"{BASE}/calculate",
            json=_calculate_payload(
                personal_marginal_tax_rate=45,
                annual_rental_income=200_000,
            ),
        )
        data = r.json()
        assert data["gmbh_advantage_at_exit"] > 0

    def test_low_income_favors_private(self, client: TestClient) -> None:
        r = client.post(
            f"{BASE}/calculate",
            json=_calculate_payload(
                personal_marginal_tax_rate=15,
                annual_rental_income=12_000,
                holding_period=12,
            ),
        )
        data = r.json()
        assert data["gmbh_advantage_at_exit"] < 0


# ---------------------------------------------------------------------------
# CRUD endpoints (require auth)
# ---------------------------------------------------------------------------


class TestSaveEndpoint:
    """Tests for POST /ownership-comparison (auth required)."""

    def test_returns_401_without_auth(self, client: TestClient) -> None:
        r = client.post(f"{BASE}", json=_calculate_payload())
        assert r.status_code == 401

    def test_returns_201_with_auth(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        r = client.post(
            f"{BASE}",
            json=_calculate_payload(name="Test Save"),
            headers=normal_user_token_headers,
        )
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Test Save"
        assert data["share_id"] is not None
        assert data["private_total_wealth"] > 0

    def test_saved_has_results_json(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        r = client.post(
            f"{BASE}",
            json=_calculate_payload(),
            headers=normal_user_token_headers,
        )
        data = r.json()
        assert "results" in data
        assert "private" in data["results"]
        assert "gmbh" in data["results"]


class TestListEndpoint:
    """Tests for GET /ownership-comparison (auth required)."""

    def test_returns_401_without_auth(self, client: TestClient) -> None:
        r = client.get(f"{BASE}")
        assert r.status_code == 401

    def test_returns_200_with_auth(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        r = client.get(f"{BASE}", headers=normal_user_token_headers)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "count" in data


class TestShareEndpoint:
    """Tests for GET /ownership-comparison/share/{share_id}."""

    def test_returns_404_for_invalid_share(self, client: TestClient) -> None:
        r = client.get(f"{BASE}/share/nonexistent")
        assert r.status_code == 404

    def test_shared_accessible_without_auth(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        # First save one
        r = client.post(
            f"{BASE}",
            json=_calculate_payload(),
            headers=normal_user_token_headers,
        )
        share_id = r.json()["share_id"]

        # Access without auth
        r2 = client.get(f"{BASE}/share/{share_id}")
        assert r2.status_code == 200
        assert r2.json()["share_id"] == share_id


# ---------------------------------------------------------------------------
# GET /ownership-comparison/{calc_id}
# ---------------------------------------------------------------------------


class TestGetByIdEndpoint:
    """Tests for GET /ownership-comparison/{calc_id} (auth required)."""

    def test_returns_401_without_auth(self, client: TestClient) -> None:
        fake_id = str(uuid.uuid4())
        r = client.get(f"{BASE}/{fake_id}")
        assert r.status_code == 401

    def test_returns_200_for_owner(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        saved = _save_comparison(client, normal_user_token_headers)
        calc_id = saved["id"]

        r = client.get(f"{BASE}/{calc_id}", headers=normal_user_token_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == calc_id
        assert data["results"] is not None

    def test_returns_404_for_nonexistent(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        fake_id = str(uuid.uuid4())
        r = client.get(f"{BASE}/{fake_id}", headers=normal_user_token_headers)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /ownership-comparison/{calc_id}
# ---------------------------------------------------------------------------


class TestDeleteEndpoint:
    """Tests for DELETE /ownership-comparison/{calc_id} (auth required)."""

    def test_returns_401_without_auth(self, client: TestClient) -> None:
        fake_id = str(uuid.uuid4())
        r = client.delete(f"{BASE}/{fake_id}")
        assert r.status_code == 401

    def test_returns_204_and_removes(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        saved = _save_comparison(client, normal_user_token_headers)
        calc_id = saved["id"]

        r = client.delete(f"{BASE}/{calc_id}", headers=normal_user_token_headers)
        assert r.status_code == 204

        # Confirm it's gone
        r2 = client.get(f"{BASE}/{calc_id}", headers=normal_user_token_headers)
        assert r2.status_code == 404

    def test_returns_404_for_nonexistent(
        self, client: TestClient, normal_user_token_headers: dict[str, str]
    ) -> None:
        fake_id = str(uuid.uuid4())
        r = client.delete(f"{BASE}/{fake_id}", headers=normal_user_token_headers)
        assert r.status_code == 404
