"""Validate property evaluation calculator against spec test case.

Uses monthly compounding for loan amortisation (spec Section 4.7 recommendation).
This produces slightly different interest/repayment values vs the annual-compounding
reference table, which the spec acknowledges in Section 8.2.

The monthly AfA display uses afa_basis × afa_rate / 12 = 490.19, not the
unverified 557.14 from the screenshot (spec Section 8.1).

Run with: python -m pytest tests/test_evaluation_spec.py -v
"""

from app.services.property_evaluation_calculator import (
    EvaluationInputs,
    calculate,
    german_income_tax,
)

# ---------------------------------------------------------------------------
# Reference inputs from spec Section 7
# ---------------------------------------------------------------------------

SPEC_INPUTS = EvaluationInputs(
    square_meters=25.7,
    purchase_price=95_000,
    rent_per_m2=22.00,
    parking_space_rent=50.00,
    broker_fee_rate=0.0357,
    notary_fee_rate=0.0150,
    land_registry_fee_rate=0.0050,
    property_transfer_tax_rate=0.0500,
    base_allocable_costs=105.00,
    property_tax_monthly=5.00,
    base_non_allocable_costs=42.00,
    reserves_monthly=20.00,
    building_share_pct=0.70,
    afa_rate=0.08,
    loan_pct_of_purchase=1.00,
    interest_rate=0.0505,
    initial_repayment_rate=0.0150,
    personal_taxable_income=100_000.00,
    personal_marginal_tax_rate=0.42,
    rent_increase_pa=0.02,
    value_increase_pa=0.02,
    cost_increase_pa=0.02,
    renovation_year=2,
    renovation_cost=5_000.00,
    start_year=2025,
    analysis_years=11,
)


def close(a: float, b: float, tol: float = 0.01) -> bool:
    return abs(a - b) <= tol


# ---------------------------------------------------------------------------
# Section 2.1: Property Purchase
# ---------------------------------------------------------------------------


class TestPropertyPurchase:
    def setup_method(self):
        self.r = calculate(SPEC_INPUTS)

    def test_price_per_m2(self):
        # Spec says 3695.72 but 95000/25.7 = 3696.498 — spec has rounding error
        assert close(self.r.price_per_m2, 3696.50, tol=0.01)

    def test_broker_fee(self):
        assert close(self.r.broker_fee_amount, 3391.50)

    def test_notary_fee(self):
        assert close(self.r.notary_fee_amount, 1425.00)

    def test_land_registry_fee(self):
        assert close(self.r.land_registry_fee_amount, 475.00)

    def test_transfer_tax(self):
        assert close(self.r.property_transfer_tax_amount, 4750.00)

    def test_total_closing_costs(self):
        assert close(self.r.total_closing_costs, 10041.50)

    def test_total_closing_costs_pct(self):
        assert close(self.r.total_closing_costs_pct, 0.1057, tol=0.0001)

    def test_total_investment(self):
        assert close(self.r.total_investment, 105041.50)


# ---------------------------------------------------------------------------
# Section 2.2: Rent
# ---------------------------------------------------------------------------


class TestRent:
    def setup_method(self):
        self.r = calculate(SPEC_INPUTS)

    def test_apartment_cold_rent(self):
        assert close(self.r.apartment_cold_rent_monthly, 565.40)

    def test_total_cold_rent(self):
        assert close(self.r.total_cold_rent_monthly, 615.40)

    def test_allocable_costs(self):
        assert close(self.r.allocable_costs_monthly, 110.00)

    def test_warm_rent(self):
        assert close(self.r.warm_rent_monthly, 725.40)


# ---------------------------------------------------------------------------
# Section 2.3: Management Costs
# ---------------------------------------------------------------------------


class TestManagementCosts:
    def setup_method(self):
        self.r = calculate(SPEC_INPUTS)

    def test_non_allocable(self):
        assert close(self.r.non_allocable_costs_monthly, 62.00)

    def test_total_hausgeld(self):
        assert close(self.r.total_hausgeld_monthly, 172.00)

    def test_non_allocable_pct(self):
        assert close(self.r.non_allocable_as_pct_of_cold_rent, 0.1097, tol=0.0001)


# ---------------------------------------------------------------------------
# Section 2.4: Depreciation
# ---------------------------------------------------------------------------


class TestDepreciation:
    def setup_method(self):
        self.r = calculate(SPEC_INPUTS)

    def test_afa_basis(self):
        assert close(self.r.afa_basis, 73529.05)

    def test_annual_afa(self):
        assert close(self.r.annual_afa, 5320.00)

    def test_monthly_afa_display(self):
        assert close(self.r.monthly_afa_display, 490.19)


# ---------------------------------------------------------------------------
# Section 2.5: Financing
# ---------------------------------------------------------------------------


class TestFinancing:
    def setup_method(self):
        self.r = calculate(SPEC_INPUTS)

    def test_loan_amount(self):
        assert close(self.r.loan_amount, 95000.00)

    def test_equity(self):
        assert close(self.r.equity, 10041.50)

    def test_annual_debt_service(self):
        assert close(self.r.annual_debt_service, 6222.50)

    def test_monthly_debt_service(self):
        assert close(self.r.monthly_debt_service, 518.54)

    def test_monthly_interest_yr1(self):
        assert close(self.r.monthly_interest_yr1, 399.79)

    def test_monthly_repayment_yr1(self):
        assert close(self.r.monthly_repayment_yr1, 118.75)


# ---------------------------------------------------------------------------
# Section 2.6: Rental Yield
# ---------------------------------------------------------------------------


class TestRentalYield:
    def setup_method(self):
        self.r = calculate(SPEC_INPUTS)

    def test_net_cold_rent_annual(self):
        assert close(self.r.net_cold_rent_annual, 6784.80)

    def test_gross_rental_yield(self):
        assert close(self.r.gross_rental_yield, 0.0714, tol=0.0001)

    def test_factor_cold_rent_vs_price(self):
        assert close(self.r.factor_cold_rent_vs_price, 14.00, tol=0.01)


# ---------------------------------------------------------------------------
# Section 2.7: Monthly Cashflow
# ---------------------------------------------------------------------------


class TestMonthlyCashflow:
    def setup_method(self):
        self.r = calculate(SPEC_INPUTS)

    def test_cashflow_pretax(self):
        assert close(self.r.monthly_cashflow_pretax, 34.86)

    def test_monthly_taxable_property_income(self):
        # Uses our verified monthly_afa = 490.19
        # 725.40 - 172.00 - 399.79 - 490.19 = -336.58
        assert close(self.r.monthly_taxable_property_income, -336.58, tol=0.01)

    def test_tax_benefit(self):
        # 336.58 × 0.42 = 141.36
        assert close(self.r.monthly_tax_benefit, 141.36, tol=0.01)

    def test_cashflow_after_tax(self):
        # 34.86 + 141.36 = 176.22
        assert close(self.r.monthly_cashflow_after_tax, 176.22, tol=0.01)


# ---------------------------------------------------------------------------
# Section 3: German Income Tax (§32a EStG 2025)
# ---------------------------------------------------------------------------


class TestGermanIncomeTax:
    def test_at_100k(self):
        tax = german_income_tax(100_000)
        assert close(tax, 32027.02)

    def test_zero_income(self):
        assert german_income_tax(0) == 0.0

    def test_basic_allowance(self):
        assert german_income_tax(11_784) == 0.0

    def test_zone2_boundary(self):
        tax = german_income_tax(17_005)
        assert tax > 0

    def test_top_rate(self):
        tax = german_income_tax(300_000)
        assert close(tax, 300_000 * 0.45 - 18_307.73)


# ---------------------------------------------------------------------------
# Section 4: Annual Cashflow Table
#
# Monthly compounding produces slightly different interest/repayment values
# vs the annual-compounding reference. Tolerances are set accordingly.
# The spec (Section 8.2) explicitly recommends this approach.
# ---------------------------------------------------------------------------


class TestAnnualTable:
    def setup_method(self):
        self.r = calculate(SPEC_INPUTS)
        self.rows = self.r.annual_rows

    def test_row_count(self):
        assert len(self.rows) == 11

    def test_years(self):
        assert self.rows[0].year == 2025
        assert self.rows[10].year == 2035

    # 4.3 Property value
    def test_property_value_yr1(self):
        assert close(self.rows[0].property_value, 96900.00)

    def test_property_value_yr11(self):
        assert close(self.rows[10].property_value, 118120.33, tol=1.0)

    # 4.4 Cold rent
    def test_cold_rent_yr1(self):
        assert close(self.rows[0].cold_rent, 7384.80)

    def test_cold_rent_yr2(self):
        assert close(self.rows[1].cold_rent, 7532.50, tol=0.1)

    def test_cold_rent_yr11(self):
        assert close(self.rows[10].cold_rent, 9001.70, tol=1.0)

    # 4.5 Management costs
    def test_management_constant(self):
        for row in self.rows:
            assert close(row.management_annual, 744.00)

    # 4.6 Operational cashflow
    def test_operational_cf_yr1(self):
        assert close(self.rows[0].operational_cf, 6640.80)

    def test_operational_cf_yr2(self):
        assert close(self.rows[1].operational_cf, 6788.50, tol=0.1)

    # 4.7 Loan schedule (monthly compounding)
    # Annual-compounding reference: interest=4797.50, repayment=1425.00
    # Monthly compounding produces: interest≈4764, repayment≈1458
    # Difference ~33€ per year (0.7% of annual debt service) — acceptable per spec §8.2
    def test_interest_yr1(self):
        assert close(self.rows[0].interest, 4764.05, tol=1.0)

    def test_repayment_yr1(self):
        assert close(self.rows[0].repayment, 1458.45, tol=1.0)

    # Annual debt service is constant regardless of compounding
    def test_debt_service_constant(self):
        for row in self.rows:
            total = row.interest + row.repayment
            assert close(total, 6222.50, tol=0.01)

    # 4.10 Earnings before tax (affected by monthly compounding interest)
    def test_ebt_yr1(self):
        # 6640.80 - 4764.05 - 5320 - 0 = -3443.25
        assert close(self.rows[0].earnings_before_tax, -3443.25, tol=1.0)

    def test_ebt_yr2(self):
        # 6788.50 - interest_yr2 - 5320 - 5000
        assert close(self.rows[1].earnings_before_tax, -8220.17, tol=1.0)

    # Tax effect
    def test_tax_effect_yr1(self):
        # 3443.25 × 0.42 = 1446.17
        assert close(self.rows[0].tax_effect_marginal, 1446.17, tol=1.0)

    def test_tax_effect_yr2(self):
        # 8220.17 × 0.42 = 3452.47
        assert close(self.rows[1].tax_effect_marginal, 3452.47, tol=1.0)

    # Net cashflow after tax
    def test_net_cf_after_tax_yr1(self):
        # 418.30 + 1446.17 = 1864.47
        assert close(self.rows[0].net_cf_after_tax, 1864.47, tol=1.0)

    def test_net_cf_after_tax_yr2(self):
        # 566.00 + 3452.47 = 4018.47
        assert close(self.rows[1].net_cf_after_tax, 4018.47, tol=1.0)

    # 4.11 Progressive tax
    def test_taxable_income_adjusted_yr1(self):
        # 100000 + (-3443.25) = 96556.75
        assert close(self.rows[0].taxable_income_adjusted, 96556.75, tol=1.0)

    def test_progressive_tax_saving_yr1(self):
        # base_tax(100000) - tax(96556.75) ≈ 1446
        assert close(self.rows[0].actual_tax_saving, 1446.17, tol=1.0)

    # 4.12 Equity buildup yr1 (monthly compounding balance ≈ 93541)
    def test_equity_buildup_yr1(self):
        # 96900 - 93541.55 = 3358.45
        assert close(self.rows[0].equity_buildup_accumulated, 3358.45, tol=1.0)

    # Operating years consistency: CF grows with rent growth (skip renovation year spike)
    def test_net_cf_after_tax_increases_after_renovation(self):
        # After renovation year, CF should increase year over year
        # Year 2 is inflated by 5000€ renovation deduction, year 3 drops back
        for i in range(3, 10):
            assert self.rows[i].net_cf_after_tax > self.rows[i - 1].net_cf_after_tax - 10

    # Exit year includes property sale
    def test_net_cf_after_tax_exit(self):
        # Exit year is much larger than operating years due to sale proceeds
        assert self.rows[10].net_cf_after_tax > 30000


# ---------------------------------------------------------------------------
# KPIs
# ---------------------------------------------------------------------------


class TestKPIs:
    def setup_method(self):
        self.r = calculate(SPEC_INPUTS)

    def test_total_operational_cf(self):
        assert close(self.r.total_operational_cf, 81679.53, tol=5.0)

    def test_total_net_cf_after_tax(self):
        # Slightly different from spec due to monthly compounding
        assert self.r.total_net_cf_after_tax > 60000
        assert self.r.total_net_cf_after_tax < 70000

    def test_total_equity_invested(self):
        assert close(self.r.total_equity_invested, 15041.50)

    def test_final_equity_kpi(self):
        # Equity buildup - total equity invested, should be significantly positive
        assert self.r.final_equity_kpi > 25000
        assert self.r.final_equity_kpi < 40000
