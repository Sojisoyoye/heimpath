"""Tests for the market API endpoints."""

from starlette.testclient import TestClient

BASE = "/api/v1/market"


class TestRentEstimateEndpoint:
    """GET /api/v1/market/rent-estimate"""

    def test_valid_city_postcode_returns_200(self, client: TestClient) -> None:
        r = client.get(f"{BASE}/rent-estimate", params={"postcode": "10115"})
        assert r.status_code == 200
        body = r.json()
        assert body["confidence"] == "high"
        assert body["city"] == "Berlin"
        assert body["estimated_rent_per_sqm"] is not None

    def test_valid_rural_postcode_returns_200(self, client: TestClient) -> None:
        r = client.get(f"{BASE}/rent-estimate", params={"postcode": "99999"})
        assert r.status_code == 200
        body = r.json()
        assert body["confidence"] == "medium"
        assert body["state_code"] == "TH"

    def test_with_size_returns_monthly_rent(self, client: TestClient) -> None:
        r = client.get(
            f"{BASE}/rent-estimate",
            params={"postcode": "10115", "size_sqm": "75"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["monthly_rent"] is not None
        assert body["monthly_rent"] > 0

    def test_with_building_year(self, client: TestClient) -> None:
        r = client.get(
            f"{BASE}/rent-estimate",
            params={"postcode": "10115", "building_year": "2020"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["estimated_rent_per_sqm"] > 13.5  # post_2014 adjustment

    def test_invalid_postcode_format_returns_422(self, client: TestClient) -> None:
        r = client.get(f"{BASE}/rent-estimate", params={"postcode": "ABC"})
        assert r.status_code == 422

    def test_short_postcode_returns_422(self, client: TestClient) -> None:
        r = client.get(f"{BASE}/rent-estimate", params={"postcode": "123"})
        assert r.status_code == 422

    def test_missing_postcode_returns_422(self, client: TestClient) -> None:
        r = client.get(f"{BASE}/rent-estimate")
        assert r.status_code == 422

    def test_response_schema_keys(self, client: TestClient) -> None:
        r = client.get(f"{BASE}/rent-estimate", params={"postcode": "10115"})
        assert r.status_code == 200
        body = r.json()
        expected_keys = {
            "estimated_rent_per_sqm",
            "rent_range",
            "source",
            "confidence",
            "city",
            "state_code",
            "monthly_rent",
        }
        assert set(body.keys()) == expected_keys
