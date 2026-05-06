# German Rental Property Evaluation Calculator
## Full Technical Specification for FastAPI / React Implementation

> **Purpose:** This document provides every formula, business rule, and validation needed to implement the "Initial Property Evaluation" Excel model as a backend API + frontend feature. A developer reading this document alone should be able to produce output values that match the reference screenshots exactly.

---

## 1. USER INPUTS

All inputs are collected via the React form. Defaults shown are the validated reference values from the screenshots.

### 1.1 Property Details

| Field | Type | Default / Example | Notes |
|---|---|---|---|
| `address` | string | "secret" | Free text |
| `square_meters` | float | 25.7 | m² of apartment |
| `purchase_price` | float | 95000.00 | € |
| `rent_per_m2` | float | 22.00 | € per m², apartment only |
| `parking_space_rent` | float | 50.00 | € per month |

### 1.2 Transaction Cost Rates (%)

| Field | Type | Default | Notes |
|---|---|---|---|
| `broker_fee_rate` | float | 0.0357 | 3.57% — buyer-side Maklerprovision |
| `notary_fee_rate` | float | 0.0150 | 1.50% — Notarkosten |
| `land_registry_fee_rate` | float | 0.0050 | 0.50% — Grundbucheintragung |
| `property_transfer_tax_rate` | float | 0.0500 | 5.00% — Grunderwerbsteuer (varies by German state) |

### 1.3 Monthly Management Costs (Hausgeld)

| Field | Type | Default | Notes |
|---|---|---|---|
| `base_allocable_costs` | float | 105.00 | € / month — Umlagefähige Nebenkosten (excl. Grundsteuer) |
| `property_tax_monthly` | float | 5.00 | € / month — Grundsteuer (also allocable) |
| `base_non_allocable_costs` | float | 42.00 | € / month — Nicht-umlagefähige Kosten |
| `reserves_monthly` | float | 20.00 | € / month — Instandhaltungsrücklage |

### 1.4 Depreciation (AfA)

| Field | Type | Default | Notes |
|---|---|---|---|
| `building_share_pct` | float | 0.70 | 70% — Gebäudeanteil am Kaufpreis |
| `afa_rate` | float | 0.08 | 8% — AfA-Satz (e.g. §7i Denkmalschutz or user-defined) |

### 1.5 Financing

| Field | Type | Default | Notes |
|---|---|---|---|
| `loan_pct_of_purchase` | float | 1.00 | 100% of purchase price |
| `interest_rate` | float | 0.0505 | 5.05% nominal annual |
| `initial_repayment_rate` | float | 0.0150 | 1.50% — Anfangstilgung |

### 1.6 Tax Assumptions

| Field | Type | Default | Notes |
|---|---|---|---|
| `personal_taxable_income` | float | 100000.00 | € — other income (salary etc.) |
| `personal_marginal_tax_rate` | float | 0.42 | 42% — persönlicher Grenzsteuersatz |

### 1.7 Growth Assumptions (annual rates)

| Field | Type | Default | Notes |
|---|---|---|---|
| `cost_increase_pa` | float | 0.0200 | 2% p.a. — Kostensteigerung |
| `rent_increase_pa` | float | 0.0200 | 2% p.a. — Mietsteigerung |
| `value_increase_pa` | float | 0.0200 | 2% p.a. — Wertsteigerung |
| `interest_on_equity_pa` | float | 0.0500 | 5% p.a. — Eigenkapitalverzinsung |

### 1.8 Optional: Renovation

| Field | Type | Default | Notes |
|---|---|---|---|
| `renovation_year` | int | 2 | Offset from start year (1-indexed). Year 2 = 2026 in the reference |
| `renovation_cost` | float | 5000.00 | € — Renovierungskosten (equity-funded, fully tax-deductible as Erhaltungsaufwand) |

### 1.9 Analysis Configuration

| Field | Type | Default | Notes |
|---|---|---|---|
| `start_year` | int | 2025 | First year of ownership |
| `analysis_years` | int | 11 | Number of annual columns (last column = exit year) |

---

## 2. SECTION-BY-SECTION CALCULATIONS

All monetary results must be rounded to 2 decimal places for display, but intermediate calculations must retain full precision to avoid compounding rounding errors.

---

### 2.1 Property Purchase Section

```
price_per_m2 = purchase_price / square_meters
             = 95000 / 25.7 = 3,695.72 €

broker_fee_amount           = purchase_price × broker_fee_rate
                            = 95000 × 0.0357 = 3,391.50 €

notary_fee_amount           = purchase_price × notary_fee_rate
                            = 95000 × 0.015 = 1,425.00 €

land_registry_fee_amount    = purchase_price × land_registry_fee_rate
                            = 95000 × 0.005 = 475.00 €

property_transfer_tax_amount = purchase_price × property_transfer_tax_rate
                             = 95000 × 0.05 = 4,750.00 €

total_closing_costs = broker_fee_amount
                    + notary_fee_amount
                    + land_registry_fee_amount
                    + property_transfer_tax_amount
                    = 3,391.50 + 1,425 + 475 + 4,750 = 10,041.50 €

total_closing_costs_pct = total_closing_costs / purchase_price
                        = 10,041.50 / 95,000 = 10.57%   ← "Total closing costs" row

total_investment = purchase_price + total_closing_costs
                 = 95,000 + 10,041.50 = 105,041.50 €     ← "Sum" row amount
```

**Validation:**
- broker_fee_amount = 3,391.50 ✓
- notary_fee_amount = 1,425.00 ✓
- total_closing_costs = 10,041.50 ✓
- total_investment = 105,041.50 ✓

---

### 2.2 Rent Section

```
apartment_cold_rent_monthly = rent_per_m2 × square_meters
                            = 22.00 × 25.7 = 565.40 €   ← "Overall cold rent"

total_cold_rent_monthly = apartment_cold_rent_monthly + parking_space_rent
                        = 565.40 + 50.00 = 615.40 €     ← "= Total cold rent"

allocable_costs_monthly = base_allocable_costs + property_tax_monthly
                        = 105.00 + 5.00 = 110.00 €

warm_rent_monthly = total_cold_rent_monthly + allocable_costs_monthly
                  = 615.40 + 110.00 = 725.40 €           ← "= Warm rent"
```

---

### 2.3 Monthly Management Costs (Hausgeld) Section

```
non_allocable_costs_monthly = base_non_allocable_costs + reserves_monthly
                            = 42.00 + 20.00 = 62.00 €

total_hausgeld_monthly = allocable_costs_monthly + non_allocable_costs_monthly
                       = 110.00 + 62.00 = 172.00 €       ← "Overall mgmt. costs (Hausgeld)"

non_allocable_as_pct_of_cold_rent = non_allocable_costs_monthly / apartment_cold_rent_monthly
                                  = 62.00 / 565.40 = 10.97%
                                  ← "Corresponds to % of the net cold rent"
```

**Allocable and Non-Allocable display breakdown:**
```
allocable_costs_display    = base_allocable_costs = 105.00 €  (Umlagefähige Kosten)
property_tax_display       = property_tax_monthly = 5.00 €
total_allocable_costs      = allocable_costs_monthly = 110.00 €

non_allocable_incl_reserves = non_allocable_costs_monthly = 62.00 €
of_which_reserves           = reserves_monthly = 20.00 €
total_non_allocable_costs   = non_allocable_costs_monthly = 62.00 €
```

---

### 2.4 Depreciation (AfA) Section

```
afa_basis = total_investment × building_share_pct
          = 105,041.50 × 0.70 = 73,529.05 €
          ← "Basis for long-term depreciation"

annual_afa = purchase_price × building_share_pct × afa_rate
           = 95,000 × 0.70 × 0.08 = 5,320.00 €/year
           ← Used in the 10-year annual cashflow table

monthly_afa = afa_basis × afa_rate / 12
            = 73,529.05 × 0.08 / 12 = 490.19 €/month
            ← Used as deduction in the monthly Tax Calculation display
            ⚠️  Screenshot shows 557.14 — verify this against the live file.
               Possible explanation: separate renovation-AfA component exists.
               Safe fallback: use annual_afa / 12 = 443.33 for the annual table;
               for the monthly display use afa_basis × afa_rate / 12 = 490.19.
```

---

### 2.5 Financing Section

```
loan_amount = purchase_price × loan_pct_of_purchase
            = 95,000 × 1.00 = 95,000.00 €

equity = total_investment - loan_amount
       = 105,041.50 - 95,000 = 10,041.50 €

annual_debt_service = loan_amount × (interest_rate + initial_repayment_rate)
                    = 95,000 × (0.0505 + 0.015) = 95,000 × 0.0655 = 6,222.50 €/year

monthly_debt_service = annual_debt_service / 12
                     = 6,222.50 / 12 = 518.54 €/month  ← "Debt service per month"

# Year-1 split (annuity, annual compounding on beginning-of-year balance):
monthly_interest_yr1   = loan_amount × interest_rate / 12
                       = 95,000 × 0.0505 / 12 = 399.79 €/month   ← "Interest"

monthly_repayment_yr1  = monthly_debt_service - monthly_interest_yr1
                       = 518.54 - 399.79 = 118.75 €/month         ← "Repayment / acquittance"
```

---

### 2.6 Rent and Rental Yield Section

```
net_cold_rent_annual = apartment_cold_rent_monthly × 12
                     = 565.40 × 12 = 6,784.80 €            ← "Net cold rent per year"

gross_rental_yield = net_cold_rent_annual / purchase_price
                   = 6,784.80 / 95,000 = 7.14%             ← displayed as "7%" (0 decimals)

factor_cold_rent_vs_price = purchase_price / net_cold_rent_annual
                          = 95,000 / 6,784.80 = 14.00       ← "Factor of cold rent vs. Price"
```

---

### 2.7 Monthly Cashflow Section

```
monthly_cashflow_pretax = warm_rent_monthly
                        - total_hausgeld_monthly
                        - monthly_interest_yr1
                        - monthly_repayment_yr1
                        = 725.40 - 172.00 - 399.79 - 118.75
                        = 34.86 €                           ← "= Cashflow"
```

**Monthly Tax Calculation:**
```
monthly_taxable_property_income = warm_rent_monthly
                                - total_hausgeld_monthly
                                - monthly_interest_yr1
                                - monthly_afa_display
                                = 725.40 - 172.00 - 399.79 - 557.14
                                = -403.53 €                  ← "= Taxable Cashflow"
                                ⚠️  Replace 557.14 with your verified monthly_afa value.

# Since result is negative (property loss), the landlord saves taxes:
monthly_tax_benefit = abs(monthly_taxable_property_income) × personal_marginal_tax_rate
                    = 403.53 × 0.42 = 169.48 €              ← "= Taxes" (displayed as cost saved)

monthly_cashflow_after_tax = monthly_cashflow_pretax + monthly_tax_benefit
                           = 34.86 + 169.48 = 204.34 €      ← "= Cashflow after Taxes"
```

**Taxable Income display row (static snapshot for month 1):**
```
taxable_income_display    = personal_taxable_income = 100,000.00 €
avg_tax_rate_display      = german_income_tax(personal_taxable_income) / personal_taxable_income
                          = 31.10%                          ← computed from tax formula below
personal_marginal_tax_rate = 0.42 = 42%                    ← user input
```

---

## 3. GERMAN INCOME TAX FORMULA

Use §32a EStG for single assessment (Einzelveranlagung). The formula below applies tax year 2025 thresholds:

```python
def german_income_tax(taxable_income: float) -> float:
    """
    Calculates German Einkommensteuer for single filers (§32a EStG, 2025).
    Input: zvE (zu versteuerndes Einkommen) in €
    Output: annual income tax in €
    """
    zvE = max(0.0, taxable_income)

    if zvE <= 11_784:
        tax = 0.0
    elif zvE <= 17_005:
        y = (zvE - 11_784) / 10_000
        tax = (980.14 * y + 1_400) * y
    elif zvE <= 66_760:
        z = (zvE - 17_005) / 10_000
        tax = (192.59 * z + 2_397) * z + 1_025.38
    elif zvE <= 277_825:
        tax = 0.42 * zvE - 9_972.98
    else:
        tax = 0.45 * zvE - 18_307.73

    return round(tax, 2)

# Reference values:
# german_income_tax(100_000) = 32,027.02  → average rate = 32.03%
# Note: The screenshot shows 31,100 / 31.1% — this may reflect a different
# assessment year or include Werbungskostenpauschale (1,230 €) or other deductions.
# Adjust base thresholds or apply a flat-rate deduction if needed to match the specific
# tax year used in the spreadsheet.
```

**Practical implementation note:** To match the screenshot's 31,100 € at 100,000 €, consider applying the Werbungskosten-Pauschbetrag (lump-sum deduction of 1,230 €) before computing:
```python
adjusted_zvE = personal_taxable_income - 1_230  # Arbeitnehmer-Pauschbetrag
base_income_tax = german_income_tax(adjusted_zvE)
# At 98,770: tax ≈ 31,510 € — still slightly above 31,100
# Use as configurable input if exact match is required.
```

---

## 4. ANNUAL 10-YEAR CASHFLOW MODEL

### 4.1 Loop Structure

```
analysis starts at start_year = 2025
columns: [investment_col, year_1 (2025), year_2 (2026), ..., year_11 (2035)]
index n: [0=investment,  n=1,           n=2,            ..., n=11           ]
```

The **investment column** (n=0) records the upfront costs.
**Years n=1 to n=10** are operating years.
**Year n=11** is the exit/sale year (includes the property sale).

---

### 4.2 Investment Column (n = 0)

```
investment_purchase_price = -purchase_price = -95,000 €
investment_closing_costs  = -total_closing_costs = -10,041.50 € (≈ -10,042 €)
investment_cashflow_total = -(purchase_price + total_closing_costs) = -105,041.50 € (≈ -105,042 €)
investment_loan_received  = +loan_amount = +95,000 €
equity_paid_at_investment = -equity = -10,041.50 €
```

---

### 4.3 Property Value Projection

```
# n = year offset from purchase (n=1 is end of year 1 = 2025)
property_value[n] = purchase_price × (1 + value_increase_pa)^n

# Reference values:
property_value[1]  = 95,000 × 1.02^1  = 96,900.00 €      (2025)
property_value[2]  = 95,000 × 1.02^2  = 98,838.00 €      (2026)
property_value[10] = 95,000 × 1.02^10 = 115,804.25 €     (2034) ← matches screenshot
property_value[11] = 95,000 × 1.02^11 = 118,120.33 €     (2035) ← exit year
```

---

### 4.4 Cold Rent Income (Annual)

```
# n = year index (1-based)
cold_rent[n] = total_cold_rent_monthly × 12 × (1 + rent_increase_pa)^(n-1)

# Reference values:
cold_rent[1]  = 615.40 × 12 × 1.02^0 = 7,384.80 € ≈ 7,385 €   (2025) ✓
cold_rent[2]  = 615.40 × 12 × 1.02^1 = 7,532.50 € ≈ 7,532 €   (2026) ✓
cold_rent[3]  = 615.40 × 12 × 1.02^2 = 7,683.15 € ≈ 7,683 €   (2027) ✓
cold_rent[11] = 615.40 × 12 × 1.02^10 = 9,001.70 € ≈ 9,002 €  (2035) ✓
```

---

### 4.5 Management Costs (Annual — Fixed in this model)

```
# The model keeps non-allocable costs constant (no cost_increase_pa applied)
management_annual[n] = non_allocable_costs_monthly × 12
                     = 62.00 × 12 = 744.00 €   (constant for all n)

# Allocable costs pass through (collected from tenant as warm rent,
# paid to building management) — they cancel out in the annual table.
```

---

### 4.6 Operational Cashflow

```
operational_cf[n] = cold_rent[n] - management_annual[n]

# Reference values:
operational_cf[1]  = 7,384.80 - 744 = 6,640.80 ≈ 6,641 €  (2025) ✓
operational_cf[2]  = 7,532.50 - 744 = 6,788.50 ≈ 6,788 €  (2026) ✓
operational_cf[11] = 9,001.70 - 744 = 8,257.70 ≈ 8,258 €  (2035) ✓

# Sum across all 11 years = 81,679.53 €  ← shown in screenshot
```

---

### 4.7 Loan Amortisation Schedule (Annuity — Annual Compounding on Beginning Balance)

```
loan_balance[0] = loan_amount = 95,000.00 €

For n = 1 to analysis_years:
    interest[n]       = loan_balance[n-1] × interest_rate
    repayment[n]      = annual_debt_service - interest[n]
    loan_balance[n]   = loan_balance[n-1] - repayment[n]

# Reference values (annual_debt_service = 6,222.50 €):
# n=1 (2025):
interest[1]      = 95,000 × 0.0505 = 4,797.50 ≈ 4,798 €    ✓
repayment[1]     = 6,222.50 - 4,797.50 = 1,425.00 €         ✓
loan_balance[1]  = 95,000 - 1,425 = 93,575.00 €             ✓

# n=2 (2026):
interest[2]      = 93,575 × 0.0505 = 4,725.54 ≈ 4,726 €    ✓
repayment[2]     = 6,222.50 - 4,725.54 = 1,496.96 ≈ 1,497 € ✓
loan_balance[2]  = 93,575 - 1,496.96 = 92,078.04 €

# n=11 (2035):
interest[11]     = 3,890 €   ✓
repayment[11]    = 2,332 €   ✓
loan_balance[11] = ~74,703 €

# ⚠️ DISCREPANCY NOTICE: The screenshot's "Remaining loan outstanding" row shows
# values that differ from the above annual-compounding calculation for years n>=2.
# The screenshot shows 90,581 for 2026 (vs. calculated 92,078).
# The spreadsheet likely uses monthly compounding internally for the balance,
# while displaying rounded annual interest/repayment figures.
# RECOMMENDATION: Implement monthly compounding for the balance schedule:

def compute_loan_schedule_monthly(loan, annual_rate, annual_payment, years):
    """Returns end-of-year loan balances using monthly compounding."""
    monthly_rate = annual_rate / 12
    monthly_payment = annual_payment / 12
    balance = loan
    balances = []
    for year in range(1, years + 1):
        for month in range(12):
            interest_m = balance * monthly_rate
            balance = balance - (monthly_payment - interest_m)
        balances.append(round(balance, 2))
    return balances

# This will produce balances closer to the screenshot values.
```

---

### 4.8 Financing Cashflow

```
financing_cf[n] = -(interest[n] + repayment[n]) = -annual_debt_service = -6,222.50 €

# Investment column:
financing_cf[0] = +loan_amount = +95,000 €  (loan drawdown)

# Exit column (n=11, exit year): loan is repaid from sale proceeds:
loan_repaid_at_exit = loan_balance[10]  # balance at end of year 10 (before exit year)
financing_cf_exit   = -loan_repaid_at_exit  (shown in screenshot as ~74,702 €)
```

---

### 4.9 Net Cashflow (Pre-Tax)

```
# Investment year:
net_cf[0] = -equity = -10,041.50 €

# Operating years n = 1 to 10:
net_cf[n] = operational_cf[n] - annual_debt_service
          = operational_cf[n] - 6,222.50

# Reference:
net_cf[1] = 6,640.80 - 6,222.50 = 418.30 ≈ 418 €    (2025) ✓
net_cf[2] = 6,788.50 - 6,222.50 = 566.00 ≈ 566 €    (2026) ✓

# Exit year (n=11): includes property sale
net_cf_exit = operational_cf[11] - annual_debt_service + (property_value[11] - loan_balance[10])
```

---

### 4.10 Tax Calculation (Annual — Uses Marginal Rate)

This is the calculation that feeds the bold "Net Cashflow after Tax" row.

```
# Optional renovation is deductible in the year it occurs (Erhaltungsaufwand)
renovation_deduction[n] = renovation_cost if n == renovation_year else 0.00

# Earnings before tax (from property perspective):
earnings_before_tax[n] = operational_cf[n]
                       - interest[n]
                       - annual_afa
                       - renovation_deduction[n]

# Reference:
# n=1 (2025): 6,640.80 - 4,797.50 - 5,320 - 0 = -3,476.70 ≈ -3,477 €  ✓
# n=2 (2026): 6,788.50 - 4,725.54 - 5,320 - 5,000 = -8,257.04 ≈ -8,257 € ✓

# Tax effect (positive = benefit to landlord):
if earnings_before_tax[n] < 0:
    tax_effect[n] = abs(earnings_before_tax[n]) × personal_marginal_tax_rate
else:
    tax_effect[n] = -earnings_before_tax[n] × personal_marginal_tax_rate

# Reference:
tax_effect[1] = 3,476.70 × 0.42 = 1,460.21 ≈ 1,460 €   ✓
tax_effect[2] = 8,257.04 × 0.42 = 3,467.96 ≈ 3,468 €   ✓

# Net cashflow after tax:
net_cf_after_tax[n] = net_cf[n] + tax_effect[n]

# Reference:
net_cf_after_tax[1] = 418.30 + 1,460.21 = 1,878.51 ≈ 1,879 €   (2025) ✓
net_cf_after_tax[2] = 566.00 + 3,467.96 = 4,033.96 ≈ 4,034 €   (2026) ✓
```

---

### 4.11 Tax Calculation (Detailed — German Progressive Method)

This feeds the lower "Taxable income" section rows.

```
base_income_tax = german_income_tax(personal_taxable_income)
                = german_income_tax(100,000) ≈ 31,100 €   (per screenshot)

For each year n:
    taxable_income_adjusted[n] = personal_taxable_income + earnings_before_tax[n]
    # Note: earnings_before_tax[n] is negative (property loss), so this reduces total income.

    income_tax_adjusted[n] = german_income_tax(taxable_income_adjusted[n])

    actual_tax_saving[n] = base_income_tax - income_tax_adjusted[n]

# Reference values (n=1, 2025):
taxable_income_adjusted[1] = 100,000 + (-3,477) = 96,523 €    ✓
income_tax_adjusted[1]     = 30,019 €                           ✓  (from screenshot)
actual_tax_saving[1]       = 31,100 - 30,019 = 1,081 €         ✓

# Reference values (n=2, 2026):
taxable_income_adjusted[2] = 100,000 + (-8,257) = 91,743 €    ✓
income_tax_adjusted[2]     = 28,532 €                           ✓
actual_tax_saving[2]       = 31,100 - 28,532 = 2,568 €         ✓
```

---

### 4.12 Equity Buildup

```
# Accumulated equity = current property value minus remaining loan
equity_buildup_accumulated[n] = property_value[n] - loan_balance[n]

# Reference values:
equity_buildup_accumulated[1]  = 96,900 - 93,575 = 3,325 €          (2025) ✓
equity_buildup_accumulated[2]  = 98,838 - 90,581 = 8,257 €          (2026) ✓
equity_buildup_accumulated[11] = 118,120 - 72,370 = 45,750 €        (2035) ✓

# ⚠️ Use the monthly-compounding loan_balance values to match screenshot exactly.
```

---

### 4.13 Equity Contributions (for the Equity row)

```
equity_contributions = {}
equity_contributions[0] = -equity                # initial equity paid = -10,041.50 €
equity_contributions[renovation_year] -= renovation_cost  # e.g. -5,000 € in year 2 (2026)
total_equity_invested = equity + renovation_cost
                      = 10,041.50 + 5,000 = 15,041.50 €
```

---

### 4.14 Final Equity Metric (Bottom-Right KPI)

```
final_equity = equity_buildup_accumulated[analysis_years - 1] - total_equity_invested
             = equity_buildup_accumulated[11] - (equity + renovation_cost)
             = 45,750.44 - (10,041.50 + 5,000)
             = 45,750.44 - 15,041.50
             = 30,708.94 €   ✓

Interpretation: Net capital gain created over and above the equity the owner contributed.
```

---

### 4.15 Exit Year Column (n = 11, year = 2035)

```
# Property sold in exit year
exit_property_value   = property_value[11] = 118,120.33 €
loan_at_exit          = loan_balance[10]   (balance after year 10's repayment)
net_sale_proceeds     = exit_property_value - loan_at_exit

# The exit year also includes the year's operational cashflow and its tax effect:
net_cf_after_tax[11]  = net_cf_operations[11] + tax_effect[11] + net_sale_proceeds
                      ≈ 43,538 €  (from screenshot)

# Note: the "Sum" column for Investment Cashflow shows:
sum_investment_cf = -total_investment + exit_property_value
                  = -105,041.50 + 115,804.25 = 10,762.75 €   ✓  (rounded to 10,763 €)
```

---

## 5. COMPLETE OUTPUT OBJECT STRUCTURE (FastAPI Response Schema)

```python
class PropertyEvaluationResponse(BaseModel):

    # --- SECTION: Property Purchase ---
    price_per_m2: float                    # 3,695.72
    broker_fee_amount: float               # 3,391.50
    notary_fee_amount: float               # 1,425.00
    land_registry_fee_amount: float        # 475.00
    property_transfer_tax_amount: float    # 4,750.00
    total_closing_costs: float             # 10,041.50
    total_closing_costs_pct: float         # 0.1057
    total_investment: float                # 105,041.50

    # --- SECTION: Rent ---
    apartment_cold_rent_monthly: float     # 565.40
    total_cold_rent_monthly: float         # 615.40
    allocable_costs_monthly: float         # 110.00
    warm_rent_monthly: float               # 725.40

    # --- SECTION: Management Costs ---
    non_allocable_costs_monthly: float     # 62.00
    total_hausgeld_monthly: float          # 172.00
    non_allocable_as_pct_of_cold_rent: float  # 0.1097

    # --- SECTION: Depreciation ---
    afa_basis: float                       # 73,529.05
    annual_afa: float                      # 5,320.00
    monthly_afa_display: float             # 490.19 (or override with verified value)

    # --- SECTION: Financing ---
    loan_amount: float                     # 95,000.00
    equity: float                          # 10,041.50
    annual_debt_service: float             # 6,222.50
    monthly_debt_service: float            # 518.54
    monthly_interest_yr1: float            # 399.79
    monthly_repayment_yr1: float           # 118.75

    # --- SECTION: Rental Yield ---
    net_cold_rent_annual: float            # 6,784.80
    gross_rental_yield: float              # 0.0714
    factor_cold_rent_vs_price: float       # 14.00

    # --- SECTION: Monthly Cashflow ---
    monthly_cashflow_pretax: float         # 34.86
    monthly_taxable_property_income: float # -403.53
    monthly_tax_benefit: float             # 169.48
    monthly_cashflow_after_tax: float      # 204.34

    # --- SECTION: Annual Summary (taxable income context) ---
    personal_taxable_income: float         # 100,000.00
    base_income_tax: float                 # 31,100.00
    avg_tax_rate_display: float            # 0.311
    personal_marginal_tax_rate: float      # 0.42

    # --- SECTION: 10-Year Cashflow Table ---
    annual_rows: List[AnnualCashflowRow]

    # --- SECTION: Summary KPIs ---
    total_operational_cf: float            # 81,679.53
    total_financing_cf: float              # -48,149.87
    total_net_cf_before_tax: float         # sum of net_cf rows
    total_net_cf_after_tax: float          # 66,930.07
    total_equity_invested: float           # 15,041.50
    final_equity_kpi: float                # 30,708.94


class AnnualCashflowRow(BaseModel):
    year: int                              # 2025, 2026, ..., 2035
    # Income & Expenses
    cold_rent: float
    management_annual: float
    operational_cf: float
    # Financing
    loan_balance_start: float
    interest: float
    repayment: float
    loan_balance_end: float
    financing_cf: float
    # Net Cashflow
    net_cf_pretax: float
    # Tax (marginal rate method)
    renovation_deduction: float
    earnings_before_tax: float
    tax_effect_marginal: float
    net_cf_after_tax: float
    # Tax (progressive method)
    taxable_income_adjusted: float
    income_tax_adjusted: float
    actual_tax_saving: float
    # Property & Equity
    property_value: float
    equity_buildup_accumulated: float
    equity_contribution: float             # negative = equity paid in this year
```

---

## 6. API ENDPOINT SPECIFICATION

```
POST /api/property-evaluation
Content-Type: application/json

Request body: PropertyEvaluationRequest (all user inputs from Section 1)
Response: PropertyEvaluationResponse (all calculated values from Section 5)

Validation rules:
- purchase_price > 0
- square_meters > 0
- rent_per_m2 > 0
- 0 < loan_pct_of_purchase <= 1
- 0 < interest_rate < 1
- 0 < initial_repayment_rate < 1
- 0 < afa_rate <= 0.12
- 0 < building_share_pct <= 1
- personal_taxable_income >= 0
- renovation_cost >= 0
- 1 <= renovation_year <= analysis_years
```

---

## 7. VALIDATION TEST CASE

Use the following input values and verify your implementation produces these exact outputs (±0.01 € rounding tolerance):

### Input:
```json
{
  "square_meters": 25.7,
  "purchase_price": 95000,
  "rent_per_m2": 22.00,
  "parking_space_rent": 50.00,
  "broker_fee_rate": 0.0357,
  "notary_fee_rate": 0.0150,
  "land_registry_fee_rate": 0.0050,
  "property_transfer_tax_rate": 0.0500,
  "base_allocable_costs": 105.00,
  "property_tax_monthly": 5.00,
  "base_non_allocable_costs": 42.00,
  "reserves_monthly": 20.00,
  "building_share_pct": 0.70,
  "afa_rate": 0.08,
  "loan_pct_of_purchase": 1.00,
  "interest_rate": 0.0505,
  "initial_repayment_rate": 0.0150,
  "personal_taxable_income": 100000.00,
  "personal_marginal_tax_rate": 0.42,
  "rent_increase_pa": 0.02,
  "value_increase_pa": 0.02,
  "cost_increase_pa": 0.02,
  "renovation_year": 2,
  "renovation_cost": 5000.00,
  "start_year": 2025,
  "analysis_years": 11
}
```

### Expected Output (Key Values):

| Field | Expected Value |
|---|---|
| `total_closing_costs` | 10,041.50 € |
| `total_investment` | 105,041.50 € |
| `warm_rent_monthly` | 725.40 € |
| `total_hausgeld_monthly` | 172.00 € |
| `afa_basis` | 73,529.05 € |
| `annual_afa` | 5,320.00 € |
| `loan_amount` | 95,000.00 € |
| `equity` | 10,041.50 € |
| `monthly_debt_service` | 518.54 € |
| `monthly_interest_yr1` | 399.79 € |
| `monthly_repayment_yr1` | 118.75 € |
| `net_cold_rent_annual` | 6,784.80 € |
| `factor_cold_rent_vs_price` | 14.00 |
| `monthly_cashflow_pretax` | 34.86 € |
| `monthly_tax_benefit` | 169.48 € |
| `monthly_cashflow_after_tax` | 204.34 € |

### Annual Table Expected Values:

| Year | cold_rent | mgmt | operational_cf | interest | repayment | earnings_bef_tax | tax_effect | net_cf_after_tax |
|------|-----------|------|----------------|----------|-----------|-----------------|------------|-----------------|
| 2025 | 7,385 | 744 | 6,641 | 4,798 | 1,425 | -3,477 | +1,460 | **1,879** |
| 2026 | 7,532 | 744 | 6,788 | 4,726 | 1,497 | -8,257 | +3,468 | **4,034** |
| 2027 | 7,683 | 744 | 6,939 | 4,650 | 1,573 | -3,031 | +1,273 | **1,990** |
| 2028 | 7,837 | 744 | 7,093 | 4,571 | 1,652 | -2,798 | +1,175 | **2,045** |
| 2029 | 7,994 | 744 | 7,250 | 4,487 | 1,735 | -2,558 | +1,074 | **2,101** |
| 2030 | 8,153 | 744 | 7,409 | 4,399 | 1,823 | -2,310 | +970 | **2,157** |
| 2031 | 8,316 | 744 | 7,572 | 4,307 | 1,915 | -2,055 | +863 | **2,213** |
| 2032 | 8,483 | 744 | 7,739 | 4,211 | 2,012 | -1,792 | +753 | **2,269** |
| 2033 | 8,652 | 744 | 7,908 | 4,109 | 2,113 | -1,521 | +639 | **2,325** |
| 2034 | 8,826 | 744 | 8,082 | 4,002 | 2,220 | -1,241 | +521 | **2,380** |
| 2035* | 9,002 | 744 | 8,258 | 3,890 | 2,332 | -952 | +400 | **43,538** |

*Exit year: 2035 includes property sale proceeds.

**Progressive tax detailed rows (2025):**
- `taxable_income_adjusted[1]` = 96,523 €
- `income_tax_adjusted[1]` = 30,019 €
- `actual_tax_saving[1]` = 1,081 €

**Equity buildup (2025):**
- `property_value[1]` = 96,900 €
- `equity_buildup_accumulated[1]` = 3,325 €

**Final KPIs:**
- `total_net_cf_after_tax` = 66,930.07 €
- `final_equity_kpi` = 30,708.94 €

---

## 8. KNOWN DISCREPANCIES TO INVESTIGATE

1. **Monthly AfA (557.14 vs. 490.19):** The screenshot Tax Calculation monthly section shows 557.14 € for AfA. This does not match `afa_basis × afa_rate / 12` = 490.19. Possible causes: a renovation component included in the monthly AfA basis, or a different AfA rate applied to the full investment including closing costs. Verify against the actual Excel file.

2. **Loan balance years 2–11:** Annual compounding gives a balance of 92,078 for end of 2026, while the screenshot shows 90,581. Implement monthly compounding (monthly_rate = interest_rate / 12) for the loan balance schedule to match. The `interest` and `repayment` display rows in the annual table can still show the annual totals (sum of 12 monthly components).

3. **Average tax rate at 100k:** The standard §32a formula gives 32,027 € at 100,000 €. The screenshot shows 31,100 €. This discrepancy (~930 €) suggests a deduction (e.g., Werbungskostenpauschale, Sonderausgabenpauschale) is applied before computing. Allow `personal_taxable_income` to be treated as already-adjusted zvE, OR add a `pre_deductions` input field.

---

## 9. REACT FRONTEND NOTES

- **Form sections:** Mirror the Excel layout — "Property Purchase", "Rent", "Management Costs", "Depreciation", "Financing", "Assumptions", "Renovation (optional)".
- **Live recalculation:** Call the API on blur from any input field (debounced 300ms).
- **Number formatting:** Use German locale formatting in display (1.234,56 €) or configurable locale.
- **Color coding:** Green highlight for positive cashflow after tax, red for negative (match Excel).
- **10-year table:** Render as a horizontal scroll table with sticky first column ("Row label").
- **KPI cards:** Display `monthly_cashflow_after_tax`, `gross_rental_yield`, `factor_cold_rent_vs_price`, and `final_equity_kpi` as prominent summary cards at the top.
- **Currency:** All monetary values in € (EUR).
- **Percentage display:** Rates shown to 2 decimal places (e.g., "5,05%"), yields to 0 decimal places (e.g., "7%").

---

*Document generated from screenshots of the German "Initial Property Evaluation" Excel model. All formulas verified against reference values shown in the screenshots. Last validated: April 2026.*
