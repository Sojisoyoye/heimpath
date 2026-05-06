"""Tests for Property Evaluation /calculate endpoint."""

from fastapi.testclient import TestClient

from app.core.config import settings

BASE = f"{settings.API_V1_STR}/calculators/property-evaluations"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _calculate_payload(**overrides) -> dict:
    """Return a valid POST body for the /calculate endpoint."""
    defaults = {
        "square_meters": 25.7,
        "purchase_price": 95_000.0,
        "rent_per_m2": 22.0,
        "parking_space_rent": 50.0,
        "broker_fee_percent": 3.57,
        "notary_fee_percent": 1.5,
        "land_registry_fee_percent": 0.5,
        "property_transfer_tax_percent": 5.0,
        "base_allocable_costs": 105.0,
        "property_tax_monthly": 5.0,
        "base_non_allocable_costs": 42.0,
        "reserves_monthly": 20.0,
        "building_share_percent": 70.0,
        "afa_rate_percent": 8.0,
        "loan_percent": 100.0,
        "interest_rate_percent": 5.05,
        "initial_repayment_rate_percent": 1.5,
        "personal_taxable_income": 100_000.0,
        "marginal_tax_rate_percent": 42.0,
        "start_year": 2025,
        "analysis_years": 11,
    }
    defaults.update(overrides)
    return defaults


# ---------------------------------------------------------------------------
# POST /property-evaluations/calculate
# ---------------------------------------------------------------------------


class TestCalculateEndpoint:
    """Tests for the /calculate endpoint (no auth)."""

    def test_returns_200(self, client: TestClient) -> None:
        """Test that a valid request returns 200."""
        r = client.post(f"{BASE}/calculate", json=_calculate_payload())
        assert r.status_code == 200

    def test_response_contains_expected_keys(self, client: TestClient) -> None:
        """Test that response has all major sections."""
        r = client.post(f"{BASE}/calculate", json=_calculate_payload())
        data = r.json()

        assert "price_per_m2" in data
        assert "total_closing_costs" in data
        assert "total_investment" in data
        assert "loan_amount" in data
        assert "gross_rental_yield" in data
        assert "monthly_cashflow_after_tax" in data
        assert "annual_rows" in data

    def test_price_per_m2(self, client: TestClient) -> None:
        """Test price per m2 calculation: 95000 / 25.7 ~ 3696.50."""
        r = client.post(f"{BASE}/calculate", json=_calculate_payload())
        data = r.json()
        assert abs(data["price_per_m2"] - 3696.50) < 1.0

    def test_total_closing_costs(self, client: TestClient) -> None:
        """Test total closing costs calculation."""
        r = client.post(f"{BASE}/calculate", json=_calculate_payload())
        data = r.json()
        # (3.57 + 1.5 + 0.5 + 5.0) / 100 * 95000 = 10041.50
        assert abs(data["total_closing_costs"] - 10041.50) < 0.1

    def test_annual_rows_count(self, client: TestClient) -> None:
        """Test that annual_rows has the expected number of rows."""
        r = client.post(f"{BASE}/calculate", json=_calculate_payload())
        data = r.json()
        assert len(data["annual_rows"]) == 11

    def test_percent_to_decimal_conversion(self, client: TestClient) -> None:
        """Test that percent-scale inputs are correctly converted to decimals."""
        r = client.post(f"{BASE}/calculate", json=_calculate_payload())
        data = r.json()
        # gross_rental_yield should be decimal (e.g. ~0.07), not percent
        assert data["gross_rental_yield"] < 1.0

    def test_rejects_zero_purchase_price(self, client: TestClient) -> None:
        """Test that zero purchase price returns 400."""
        r = client.post(
            f"{BASE}/calculate",
            json=_calculate_payload(purchase_price=0),
        )
        assert r.status_code == 400

    def test_rejects_zero_square_meters(self, client: TestClient) -> None:
        """Test that zero square meters returns 400."""
        r = client.post(
            f"{BASE}/calculate",
            json=_calculate_payload(square_meters=0),
        )
        assert r.status_code == 400

    def test_defaults_work_with_minimal_input(self, client: TestClient) -> None:
        """Test that sending only required fields uses defaults for the rest."""
        minimal = {"purchase_price": 100_000, "square_meters": 50}
        r = client.post(f"{BASE}/calculate", json=minimal)
        assert r.status_code == 200
        data = r.json()
        assert data["price_per_m2"] == 2000.0

    def test_loan_amount(self, client: TestClient) -> None:
        """Test loan amount: 100% of 95000 = 95000."""
        r = client.post(f"{BASE}/calculate", json=_calculate_payload())
        data = r.json()
        assert abs(data["loan_amount"] - 95_000.0) < 0.1

    def test_rejects_negative_purchase_price(self, client: TestClient) -> None:
        """Test that negative purchase price returns 400."""
        r = client.post(
            f"{BASE}/calculate",
            json=_calculate_payload(purchase_price=-50_000),
        )
        assert r.status_code == 400
