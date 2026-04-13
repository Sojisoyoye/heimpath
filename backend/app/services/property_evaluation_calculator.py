"""Property Evaluation Calculator — full specification implementation.

Implements the German Rental Property Evaluation model with:
- Property purchase costs breakdown
- Rent and management cost analysis
- Depreciation (AfA) calculation
- Financing with monthly-compounding loan amortisation
- Rental yield metrics
- Monthly and annual cashflow (pre-tax and after-tax)
- German income tax (§32a EStG 2025)
- 10-year annual projection with exit year
- Equity buildup and final KPIs

All formulas follow property_evaluation_spec.md exactly.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Input dataclass
# ---------------------------------------------------------------------------


@dataclass
class EvaluationInputs:
    """All user inputs for the property evaluation."""

    # 1.1 Property Details
    address: str = ""
    square_meters: float = 0.0
    purchase_price: float = 0.0
    rent_per_m2: float = 0.0
    parking_space_rent: float = 0.0

    # 1.2 Transaction Cost Rates
    broker_fee_rate: float = 0.0357
    notary_fee_rate: float = 0.015
    land_registry_fee_rate: float = 0.005
    property_transfer_tax_rate: float = 0.05

    # 1.3 Monthly Management Costs (Hausgeld)
    base_allocable_costs: float = 0.0
    property_tax_monthly: float = 0.0
    base_non_allocable_costs: float = 0.0
    reserves_monthly: float = 0.0

    # 1.4 Depreciation (AfA)
    building_share_pct: float = 0.70
    afa_rate: float = 0.02

    # 1.5 Financing
    loan_pct_of_purchase: float = 1.0
    interest_rate: float = 0.04
    initial_repayment_rate: float = 0.02

    # 1.6 Tax Assumptions
    personal_taxable_income: float = 0.0
    personal_marginal_tax_rate: float = 0.42

    # 1.7 Growth Assumptions
    cost_increase_pa: float = 0.02
    rent_increase_pa: float = 0.02
    value_increase_pa: float = 0.02
    interest_on_equity_pa: float = 0.05

    # 1.8 Renovation
    renovation_year: int = 0
    renovation_cost: float = 0.0

    # 1.9 Analysis Configuration
    start_year: int = 2025
    analysis_years: int = 11


# ---------------------------------------------------------------------------
# Output dataclasses
# ---------------------------------------------------------------------------


@dataclass
class AnnualCashflowRow:
    """One row of the annual cashflow table."""

    year: int = 0
    # Income & Expenses
    cold_rent: float = 0.0
    management_annual: float = 0.0
    operational_cf: float = 0.0
    # Financing
    loan_balance_start: float = 0.0
    interest: float = 0.0
    repayment: float = 0.0
    loan_balance_end: float = 0.0
    financing_cf: float = 0.0
    # Net Cashflow
    net_cf_pretax: float = 0.0
    # Tax (marginal rate method)
    renovation_deduction: float = 0.0
    earnings_before_tax: float = 0.0
    tax_effect_marginal: float = 0.0
    net_cf_after_tax: float = 0.0
    # Tax (progressive method)
    taxable_income_adjusted: float = 0.0
    income_tax_adjusted: float = 0.0
    actual_tax_saving: float = 0.0
    # Property & Equity
    property_value: float = 0.0
    equity_buildup_accumulated: float = 0.0
    equity_contribution: float = 0.0


@dataclass
class EvaluationResult:
    """Full evaluation output."""

    # Section: Property Purchase
    price_per_m2: float = 0.0
    broker_fee_amount: float = 0.0
    notary_fee_amount: float = 0.0
    land_registry_fee_amount: float = 0.0
    property_transfer_tax_amount: float = 0.0
    total_closing_costs: float = 0.0
    total_closing_costs_pct: float = 0.0
    total_investment: float = 0.0

    # Section: Rent
    apartment_cold_rent_monthly: float = 0.0
    total_cold_rent_monthly: float = 0.0
    allocable_costs_monthly: float = 0.0
    warm_rent_monthly: float = 0.0

    # Section: Management Costs
    non_allocable_costs_monthly: float = 0.0
    total_hausgeld_monthly: float = 0.0
    non_allocable_as_pct_of_cold_rent: float = 0.0

    # Section: Depreciation
    afa_basis: float = 0.0
    annual_afa: float = 0.0
    monthly_afa_display: float = 0.0

    # Section: Financing
    loan_amount: float = 0.0
    equity: float = 0.0
    annual_debt_service: float = 0.0
    monthly_debt_service: float = 0.0
    monthly_interest_yr1: float = 0.0
    monthly_repayment_yr1: float = 0.0

    # Section: Rental Yield
    net_cold_rent_annual: float = 0.0
    gross_rental_yield: float = 0.0
    factor_cold_rent_vs_price: float = 0.0

    # Section: Monthly Cashflow
    monthly_cashflow_pretax: float = 0.0
    monthly_taxable_property_income: float = 0.0
    monthly_tax_benefit: float = 0.0
    monthly_cashflow_after_tax: float = 0.0

    # Section: Annual Summary (taxable income context)
    personal_taxable_income: float = 0.0
    base_income_tax: float = 0.0
    avg_tax_rate_display: float = 0.0
    personal_marginal_tax_rate: float = 0.0

    # Section: 10-Year Cashflow Table
    annual_rows: list[AnnualCashflowRow] = field(default_factory=list)

    # Section: Summary KPIs
    total_operational_cf: float = 0.0
    total_financing_cf: float = 0.0
    total_net_cf_before_tax: float = 0.0
    total_net_cf_after_tax: float = 0.0
    total_equity_invested: float = 0.0
    final_equity_kpi: float = 0.0


# ---------------------------------------------------------------------------
# German Income Tax (§32a EStG 2025)
# ---------------------------------------------------------------------------


def german_income_tax(taxable_income: float) -> float:
    """Calculate German Einkommensteuer for single filers (§32a EStG, 2025).

    Args:
        taxable_income: zu versteuerndes Einkommen in EUR.

    Returns:
        Annual income tax in EUR.
    """
    zve = max(0.0, taxable_income)

    if zve <= 11_784:
        tax = 0.0
    elif zve <= 17_005:
        y = (zve - 11_784) / 10_000
        tax = (980.14 * y + 1_400) * y
    elif zve <= 66_760:
        z = (zve - 17_005) / 10_000
        tax = (192.59 * z + 2_397) * z + 1_025.38
    elif zve <= 277_825:
        tax = 0.42 * zve - 9_972.98
    else:
        tax = 0.45 * zve - 18_307.73

    return round(tax, 2)


# ---------------------------------------------------------------------------
# Loan schedule (monthly compounding)
# ---------------------------------------------------------------------------


def compute_loan_schedule_monthly(
    loan: float,
    annual_rate: float,
    annual_payment: float,
    years: int,
) -> list[dict]:
    """Compute year-by-year loan schedule with monthly compounding.

    Returns a list of dicts, one per year, with keys:
        balance_start, interest, repayment, balance_end
    """
    monthly_rate = annual_rate / 12
    monthly_payment = annual_payment / 12
    balance = loan
    schedule = []

    for _ in range(years):
        year_interest = 0.0
        year_repayment = 0.0
        balance_start = balance

        for _ in range(12):
            interest_m = balance * monthly_rate
            principal_m = monthly_payment - interest_m
            balance -= principal_m
            year_interest += interest_m
            year_repayment += principal_m

        schedule.append(
            {
                "balance_start": balance_start,
                "interest": year_interest,
                "repayment": year_repayment,
                "balance_end": balance,
            }
        )

    return schedule


# ---------------------------------------------------------------------------
# Section calculators
# ---------------------------------------------------------------------------


def calc_property_purchase(inp: EvaluationInputs, res: EvaluationResult) -> None:
    """Section 2.1 — Property Purchase."""
    pp = inp.purchase_price
    res.price_per_m2 = pp / inp.square_meters
    res.broker_fee_amount = pp * inp.broker_fee_rate
    res.notary_fee_amount = pp * inp.notary_fee_rate
    res.land_registry_fee_amount = pp * inp.land_registry_fee_rate
    res.property_transfer_tax_amount = pp * inp.property_transfer_tax_rate
    res.total_closing_costs = (
        res.broker_fee_amount
        + res.notary_fee_amount
        + res.land_registry_fee_amount
        + res.property_transfer_tax_amount
    )
    res.total_closing_costs_pct = res.total_closing_costs / pp if pp else 0.0
    res.total_investment = pp + res.total_closing_costs


def calc_rent(inp: EvaluationInputs, res: EvaluationResult) -> None:
    """Section 2.2 — Rent."""
    res.apartment_cold_rent_monthly = inp.rent_per_m2 * inp.square_meters
    res.total_cold_rent_monthly = (
        res.apartment_cold_rent_monthly + inp.parking_space_rent
    )
    res.allocable_costs_monthly = inp.base_allocable_costs + inp.property_tax_monthly
    res.warm_rent_monthly = res.total_cold_rent_monthly + res.allocable_costs_monthly


def calc_management_costs(inp: EvaluationInputs, res: EvaluationResult) -> None:
    """Section 2.3 — Monthly Management Costs (Hausgeld)."""
    res.non_allocable_costs_monthly = (
        inp.base_non_allocable_costs + inp.reserves_monthly
    )
    res.total_hausgeld_monthly = (
        res.allocable_costs_monthly + res.non_allocable_costs_monthly
    )
    # Guard: returns 0 when cold rent is zero (e.g. owner-occupier mode)
    res.non_allocable_as_pct_of_cold_rent = (
        res.non_allocable_costs_monthly / res.apartment_cold_rent_monthly
        if res.apartment_cold_rent_monthly
        else 0.0
    )


def calc_depreciation(inp: EvaluationInputs, res: EvaluationResult) -> None:
    """Section 2.4 — Depreciation (AfA).

    Note: afa_basis uses total_investment (includes closing costs) for display,
    but annual_afa uses purchase_price per spec — the tax-deductible AfA is
    based on the building's share of the purchase price only.
    """
    res.afa_basis = res.total_investment * inp.building_share_pct
    res.annual_afa = inp.purchase_price * inp.building_share_pct * inp.afa_rate
    res.monthly_afa_display = res.afa_basis * inp.afa_rate / 12


def calc_financing(inp: EvaluationInputs, res: EvaluationResult) -> None:
    """Section 2.5 — Financing."""
    res.loan_amount = inp.purchase_price * inp.loan_pct_of_purchase
    res.equity = res.total_investment - res.loan_amount
    res.annual_debt_service = res.loan_amount * (
        inp.interest_rate + inp.initial_repayment_rate
    )
    res.monthly_debt_service = res.annual_debt_service / 12
    res.monthly_interest_yr1 = res.loan_amount * inp.interest_rate / 12
    res.monthly_repayment_yr1 = res.monthly_debt_service - res.monthly_interest_yr1


def calc_rental_yield(res: EvaluationResult, purchase_price: float) -> None:
    """Section 2.6 — Rent and Rental Yield."""
    res.net_cold_rent_annual = res.apartment_cold_rent_monthly * 12
    res.gross_rental_yield = (
        res.net_cold_rent_annual / purchase_price if purchase_price else 0.0
    )
    res.factor_cold_rent_vs_price = (
        purchase_price / res.net_cold_rent_annual if res.net_cold_rent_annual else 0.0
    )


def calc_monthly_cashflow(inp: EvaluationInputs, res: EvaluationResult) -> None:
    """Section 2.7 — Monthly Cashflow."""
    res.monthly_cashflow_pretax = (
        res.warm_rent_monthly
        - res.total_hausgeld_monthly
        - res.monthly_interest_yr1
        - res.monthly_repayment_yr1
    )

    res.monthly_taxable_property_income = (
        res.warm_rent_monthly
        - res.total_hausgeld_monthly
        - res.monthly_interest_yr1
        - res.monthly_afa_display
    )

    if res.monthly_taxable_property_income < 0:
        res.monthly_tax_benefit = (
            abs(res.monthly_taxable_property_income) * inp.personal_marginal_tax_rate
        )
    else:
        res.monthly_tax_benefit = (
            -res.monthly_taxable_property_income * inp.personal_marginal_tax_rate
        )

    res.monthly_cashflow_after_tax = (
        res.monthly_cashflow_pretax + res.monthly_tax_benefit
    )


def calc_tax_context(inp: EvaluationInputs, res: EvaluationResult) -> None:
    """Section 2.7 continued — Taxable income display context."""
    res.personal_taxable_income = inp.personal_taxable_income
    res.base_income_tax = german_income_tax(inp.personal_taxable_income)
    res.avg_tax_rate_display = (
        res.base_income_tax / inp.personal_taxable_income
        if inp.personal_taxable_income
        else 0.0
    )
    res.personal_marginal_tax_rate = inp.personal_marginal_tax_rate


def calc_annual_model(inp: EvaluationInputs, res: EvaluationResult) -> None:
    """Sections 4.1–4.15 — Annual 10-year cashflow model."""
    n_years = inp.analysis_years
    pp = inp.purchase_price

    # Management cost (constant, non-allocable only)
    management_annual = res.non_allocable_costs_monthly * 12

    # Loan schedule (monthly compounding)
    loan_schedule = compute_loan_schedule_monthly(
        loan=res.loan_amount,
        annual_rate=inp.interest_rate,
        annual_payment=res.annual_debt_service,
        years=n_years,
    )

    # Equity contributions tracker
    total_equity_invested = res.equity
    if inp.renovation_cost > 0 and 1 <= inp.renovation_year <= n_years:
        total_equity_invested += inp.renovation_cost

    res.total_equity_invested = total_equity_invested

    # Accumulators for KPIs
    sum_operational_cf = 0.0
    sum_financing_cf = 0.0
    sum_net_cf_pretax = 0.0
    sum_net_cf_after_tax = 0.0

    rows: list[AnnualCashflowRow] = []

    for n in range(1, n_years + 1):
        row = AnnualCashflowRow()
        row.year = inp.start_year + n - 1

        # 4.3 Property value
        row.property_value = pp * (1 + inp.value_increase_pa) ** n

        # 4.4 Cold rent (total cold rent × 12, with annual growth)
        row.cold_rent = (
            res.total_cold_rent_monthly * 12 * (1 + inp.rent_increase_pa) ** (n - 1)
        )

        # 4.5 Management costs (constant)
        row.management_annual = management_annual

        # 4.6 Operational cashflow
        row.operational_cf = row.cold_rent - row.management_annual
        sum_operational_cf += row.operational_cf

        # 4.7 Loan amortisation
        ls = loan_schedule[n - 1]
        row.loan_balance_start = ls["balance_start"]
        row.interest = ls["interest"]
        row.repayment = ls["repayment"]
        row.loan_balance_end = ls["balance_end"]

        # 4.8 Financing cashflow
        row.financing_cf = -res.annual_debt_service
        sum_financing_cf += row.financing_cf

        # 4.9 Net cashflow (pre-tax)
        row.net_cf_pretax = row.operational_cf - res.annual_debt_service
        sum_net_cf_pretax += row.net_cf_pretax

        # 4.10 Tax calculation (marginal rate method)
        row.renovation_deduction = (
            inp.renovation_cost if n == inp.renovation_year else 0.0
        )
        row.earnings_before_tax = (
            row.operational_cf
            - row.interest
            - res.annual_afa
            - row.renovation_deduction
        )

        if row.earnings_before_tax < 0:
            row.tax_effect_marginal = (
                abs(row.earnings_before_tax) * inp.personal_marginal_tax_rate
            )
        else:
            row.tax_effect_marginal = (
                -row.earnings_before_tax * inp.personal_marginal_tax_rate
            )

        # 4.11 Tax calculation (progressive method)
        row.taxable_income_adjusted = (
            inp.personal_taxable_income + row.earnings_before_tax
        )
        row.income_tax_adjusted = german_income_tax(row.taxable_income_adjusted)
        row.actual_tax_saving = res.base_income_tax - row.income_tax_adjusted

        # Exit year (n == analysis_years): add property sale proceeds
        if n == n_years:
            # Loan balance at end of year 10 (before exit year)
            loan_at_exit = (
                loan_schedule[n - 2]["balance_end"] if n >= 2 else res.loan_amount
            )
            net_sale_proceeds = row.property_value - loan_at_exit
            row.net_cf_after_tax = (
                row.net_cf_pretax + row.tax_effect_marginal + net_sale_proceeds
            )
        else:
            row.net_cf_after_tax = row.net_cf_pretax + row.tax_effect_marginal

        sum_net_cf_after_tax += row.net_cf_after_tax

        # 4.12 Equity buildup
        row.equity_buildup_accumulated = row.property_value - row.loan_balance_end

        # 4.13 Equity contributions
        if n == 1:
            row.equity_contribution = -res.equity
        elif n == inp.renovation_year:
            row.equity_contribution = -inp.renovation_cost
        else:
            row.equity_contribution = 0.0

        rows.append(row)

    res.annual_rows = rows
    res.total_operational_cf = sum_operational_cf
    res.total_financing_cf = sum_financing_cf
    res.total_net_cf_before_tax = sum_net_cf_pretax
    res.total_net_cf_after_tax = sum_net_cf_after_tax

    # 4.14 Final equity KPI
    if rows:
        last_row = rows[-1]
        res.final_equity_kpi = (
            last_row.equity_buildup_accumulated - total_equity_invested
        )


# ---------------------------------------------------------------------------
# Main calculation entry point
# ---------------------------------------------------------------------------


def calculate(inp: EvaluationInputs) -> EvaluationResult:
    """Run the full property evaluation calculation.

    Args:
        inp: All user inputs.

    Returns:
        Complete evaluation result with all sections populated.
    """
    res = EvaluationResult()

    # Static sections
    calc_property_purchase(inp, res)
    calc_rent(inp, res)
    calc_management_costs(inp, res)
    calc_depreciation(inp, res)
    calc_financing(inp, res)
    calc_rental_yield(res, inp.purchase_price)
    calc_monthly_cashflow(inp, res)
    calc_tax_context(inp, res)

    # Annual model
    calc_annual_model(inp, res)

    return res
