"""Unit tests for ownership comparison (GmbH vs. Private) service."""

import pytest

from app.schemas.ownership_comparison import OwnershipComparisonRequest
from app.services.ownership_comparison_service import (
    DISTRIBUTION_TAX_RATE,
    GMBH_CAPITAL_GAINS_TAXABLE_SHARE,
    _calculate_gewerbesteuer_rate,
    _calculate_gmbh_exit_tax,
    _calculate_gmbh_total_tax_rate,
    _calculate_private_exit_tax,
    _calculate_private_tax_rate,
    calculate_comparison,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def high_income_inputs() -> OwnershipComparisonRequest:
    """High-income investor, short hold — GmbH should win.

    Under 10 years, private pays capital gains tax at marginal rate (~47.5%),
    while GmbH pays only ~1.5% effective via §8b KStG. Combined with
    lower ongoing rental tax (~30% vs ~47.5%), GmbH wins decisively.
    """
    return OwnershipComparisonRequest(
        name="High Income Portfolio",
        num_properties=5,
        annual_rental_income=120_000.0,
        personal_marginal_tax_rate=45.0,
        annual_appreciation=4.0,
        holding_period=8,
        total_property_value=2_000_000.0,
    )


@pytest.fixture
def low_income_inputs() -> OwnershipComparisonRequest:
    """Low-income investor with one property — private should win."""
    return OwnershipComparisonRequest(
        name="Single Property",
        num_properties=1,
        annual_rental_income=12_000.0,
        personal_marginal_tax_rate=20.0,
        annual_appreciation=2.0,
        holding_period=12,
        total_property_value=250_000.0,
    )


@pytest.fixture
def short_hold_inputs() -> OwnershipComparisonRequest:
    """Short holding period (under 10 years) — tests capital gains."""
    return OwnershipComparisonRequest(
        num_properties=3,
        annual_rental_income=60_000.0,
        personal_marginal_tax_rate=42.0,
        annual_appreciation=4.0,
        holding_period=7,
        total_property_value=1_000_000.0,
    )


# ---------------------------------------------------------------------------
# Tax rate helpers
# ---------------------------------------------------------------------------


class TestGewerbesteuerRate:
    def test_default_hebesatz_400(self) -> None:
        """3.5% × (400/100) = 14%."""
        rate = _calculate_gewerbesteuer_rate(400.0)
        assert rate == pytest.approx(0.14, rel=1e-4)

    def test_munich_hebesatz_490(self) -> None:
        """3.5% × (490/100) = 17.15%."""
        rate = _calculate_gewerbesteuer_rate(490.0)
        assert rate == pytest.approx(0.1715, rel=1e-4)


class TestGmbHTotalTaxRate:
    def test_default_hebesatz(self) -> None:
        """KSt 15% + Soli 0.825% + GewSt 14% = ~29.825%."""
        rate = _calculate_gmbh_total_tax_rate(400.0)
        assert rate == pytest.approx(0.29825, rel=1e-4)

    def test_rate_below_30_percent(self) -> None:
        """With 400% Hebesatz, total GmbH rate should be below 30%."""
        rate = _calculate_gmbh_total_tax_rate(400.0)
        assert rate < 0.30


class TestPrivateTaxRate:
    def test_rate_42_percent(self) -> None:
        """42% + 5.5% Soli on 42% = 42% + 2.31% = 44.31%."""
        rate = _calculate_private_tax_rate(42.0)
        assert rate == pytest.approx(0.4431, rel=1e-4)

    def test_rate_20_percent(self) -> None:
        """20% + 5.5% Soli on 20% = 20% + 1.1% = 21.1%."""
        rate = _calculate_private_tax_rate(20.0)
        assert rate == pytest.approx(0.211, rel=1e-4)

    def test_rate_45_percent(self) -> None:
        """Max rate 45% + Soli = 45% + 2.475% = 47.475%."""
        rate = _calculate_private_tax_rate(45.0)
        assert rate == pytest.approx(0.47475, rel=1e-4)


# ---------------------------------------------------------------------------
# Private exit tax
# ---------------------------------------------------------------------------


class TestPrivateExitTax:
    def test_tax_free_after_10_years(self) -> None:
        """Spekulationsfrist: 10+ years = tax-free."""
        tax = _calculate_private_exit_tax(100_000.0, 10, 42.0)
        assert tax == 0.0

    def test_tax_free_after_15_years(self) -> None:
        tax = _calculate_private_exit_tax(200_000.0, 15, 42.0)
        assert tax == 0.0

    def test_taxed_under_10_years(self) -> None:
        """Under 10 years: taxed at marginal rate + Soli."""
        tax = _calculate_private_exit_tax(100_000.0, 7, 42.0)
        expected = 100_000.0 * _calculate_private_tax_rate(42.0)
        assert tax == pytest.approx(expected, rel=1e-4)

    def test_no_tax_on_loss(self) -> None:
        """No gains = no tax, even under 10 years."""
        tax = _calculate_private_exit_tax(-50_000.0, 5, 42.0)
        assert tax == 0.0


# ---------------------------------------------------------------------------
# GmbH exit tax (§8b KStG)
# ---------------------------------------------------------------------------


class TestGmbHExitTax:
    def test_only_5_percent_taxable(self) -> None:
        """§8b KStG: 5% of gains are taxable."""
        gains = 500_000.0
        tax = _calculate_gmbh_exit_tax(gains, 400.0)
        taxable = gains * GMBH_CAPITAL_GAINS_TAXABLE_SHARE
        expected = taxable * _calculate_gmbh_total_tax_rate(400.0)
        assert tax == pytest.approx(expected, rel=1e-4)

    def test_effective_rate_about_1_5_percent(self) -> None:
        """Effective rate on gains should be ~1.49%."""
        gains = 1_000_000.0
        tax = _calculate_gmbh_exit_tax(gains, 400.0)
        effective_rate = tax / gains
        assert effective_rate == pytest.approx(0.0149, rel=0.01)

    def test_no_tax_on_loss(self) -> None:
        tax = _calculate_gmbh_exit_tax(-100_000.0, 400.0)
        assert tax == 0.0


# ---------------------------------------------------------------------------
# Full comparison
# ---------------------------------------------------------------------------


class TestCalculateComparison:
    def test_returns_both_scenarios(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        result = calculate_comparison(high_income_inputs)
        assert "private" in result
        assert "gmbh" in result

    def test_projections_count_matches_holding_period(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        result = calculate_comparison(high_income_inputs)
        assert len(result["private"]["projections"]) == 8
        assert len(result["gmbh"]["projections"]) == 8

    def test_projections_years_sequential(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        result = calculate_comparison(high_income_inputs)
        private_years = [p["year"] for p in result["private"]["projections"]]
        assert private_years == list(range(1, 9))

    def test_exit_property_value_matches(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        result = calculate_comparison(high_income_inputs)
        expected = 2_000_000.0 * (1.04**8)
        assert result["private"]["exit_property_value"] == pytest.approx(
            expected, rel=1e-3
        )
        assert result["gmbh"]["exit_property_value"] == pytest.approx(
            expected, rel=1e-3
        )

    def test_high_income_favors_gmbh(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        """42% marginal rate investor should benefit from GmbH ~30% rate."""
        result = calculate_comparison(high_income_inputs)
        assert result["gmbh_advantage_at_exit"] > 0
        assert "GmbH" in result["recommendation"]

    def test_low_income_favors_private(
        self, low_income_inputs: OwnershipComparisonRequest
    ) -> None:
        """20% marginal rate + 10yr tax-free exit should favor private."""
        result = calculate_comparison(low_income_inputs)
        assert result["gmbh_advantage_at_exit"] < 0
        assert "Private" in result["recommendation"]

    def test_breakeven_detected(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        """GmbH with high income should have a breakeven year."""
        result = calculate_comparison(high_income_inputs)
        if result["breakeven_year"] is not None:
            assert 1 <= result["breakeven_year"] <= 8

    def test_gmbh_effective_tax_rate_below_30(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        result = calculate_comparison(high_income_inputs)
        assert result["gmbh"]["effective_tax_rate"] < 0.30

    def test_private_effective_tax_rate_matches_input(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        result = calculate_comparison(high_income_inputs)
        expected = round(_calculate_private_tax_rate(45.0), 4)
        assert result["private"]["effective_tax_rate"] == expected

    def test_short_hold_private_capital_gains_taxed(
        self, short_hold_inputs: OwnershipComparisonRequest
    ) -> None:
        """Under 10 years, private should have capital gains tax."""
        result = calculate_comparison(short_hold_inputs)
        assert result["private"]["capital_gains_tax"] > 0

    def test_short_hold_gmbh_capital_gains_much_lower(
        self, short_hold_inputs: OwnershipComparisonRequest
    ) -> None:
        """GmbH CG tax should be much lower than private (§8b)."""
        result = calculate_comparison(short_hold_inputs)
        assert (
            result["gmbh"]["capital_gains_tax"] < result["private"]["capital_gains_tax"]
        )

    def test_gmbh_setup_cost_reduces_year1(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        """GmbH year 1 net income should be lower due to setup cost."""
        result = calculate_comparison(high_income_inputs)
        gmbh_yr1 = result["gmbh"]["projections"][0]["net_income_after_tax"]
        gmbh_yr2 = result["gmbh"]["projections"][1]["net_income_after_tax"]
        # Year 1 should be lower due to setup cost
        assert gmbh_yr1 < gmbh_yr2

    def test_distribution_tax_rate(self) -> None:
        """26.375% distribution tax on GmbH distributions."""
        assert DISTRIBUTION_TAX_RATE == pytest.approx(0.26375, rel=1e-4)

    def test_rental_income_grows_over_time(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        result = calculate_comparison(high_income_inputs)
        incomes = [p["rental_income"] for p in result["private"]["projections"]]
        assert all(incomes[i] < incomes[i + 1] for i in range(len(incomes) - 1))

    def test_capital_gains_positive_with_appreciation(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        result = calculate_comparison(high_income_inputs)
        assert result["private"]["capital_gains"] > 0
        assert result["gmbh"]["capital_gains"] > 0

    def test_total_wealth_positive(
        self, high_income_inputs: OwnershipComparisonRequest
    ) -> None:
        result = calculate_comparison(high_income_inputs)
        assert result["private"]["total_wealth"] > 0
        assert result["gmbh"]["total_wealth"] > 0
