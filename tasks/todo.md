# Property Evaluation Calculator: Fix & Restructure

## Context
The property evaluation calculator had several calculation bugs and its section layout didn't match the new template design. The warm rent calculation was wrong because it used a duplicate `allocableCostsPerSqm` field from the Rent section instead of deriving allocable costs from the Operating Costs section. Additionally, the loan calculation used total investment instead of purchase price, and the gross rental yield used total investment instead of purchase price. The UI needed restructuring to match the new 5-column template with proper subsections and user tips.

## Bugs Fixed

1. **Warm rent**: Now uses `coldRent + totalAllocableCosts` where totalAllocableCosts = allocable Hausgeld + property tax (from operating costs)
2. **Loan amount**: Now uses `purchasePrice * loanPercent / 100`. Equity = totalInvestment - loanAmount
3. **Gross rental yield**: Now uses `annualColdRent / purchasePrice * 100` (standard Bruttomietrendite)
4. **Management costs in cashflow**: Now uses total Hausgeld (allocable + non-allocable)

## Implementation Steps

### Step 1: Update types (`types.ts`)
- [x] Remove `allocableCostsPerSqm` from `RentInputs`
- [x] Add `equityInterestPercent` and `marginalTaxRatePercent` to `RentInputs`
- [x] Restructure `OperatingCostsInputs`: replace per-sqm fields with absolute EUR/month
- [x] Simplify `FinancingInputs` to only loan-related fields
- [x] Add new fields to `EvaluationResults`
- [x] Remove old fields from `EvaluationResults`

### Step 2: Update constants (`propertyEvaluation.ts`)
- [x] Remove old per-sqm defaults
- [x] Add new absolute EUR/month defaults (all 0)

### Step 3: Fix calculation logic (`usePropertyEvaluation.ts`)
- [x] Reorder: compute operating costs BEFORE rent
- [x] Fix warm rent formula
- [x] Fix loan formula
- [x] Fix yield formula
- [x] Add cold rent factor (Kaufpreisfaktor)
- [x] Fix management costs = totalHausgeld
- [x] Tax uses `rent.marginalTaxRatePercent`
- [x] Add return on equity metrics

### Step 4: Update container (`PropertyEvaluationCalculator.tsx`)
- [x] Update `createInitialState` for new field structure
- [x] Add localStorage migration in `loadFromStorage`
- [x] Pass `totalAllocableCosts` prop to RentSection
- [x] Pass `purchasePrice` prop to FinancingSection
- [x] Pass `coldRentMonthly` prop to OperatingCostsSection

### Step 5: Update section components
- [x] **PropertyInfoSection**: Added tip "(retrieve from Expose)"
- [x] **RentSection**: Renamed to "Rent, Taxes, Forecast", removed allocable costs input, receives `totalAllocableCosts` prop, 3 subsections: Monthly Rent, Taxes, Forecast
- [x] **OperatingCostsSection**: Restructured to absolute EUR/month inputs with summary + Abrechnung input subsections
- [x] **FinancingSection**: Added tip "(retrieve from bank offer)", changed label to "Loan (% of purchase price)", removed tax settings
- [x] **EvaluationSection**: Restructured to 4 subsections: Rent and Rental Yield, Cashflow per Month, Tax Calculation, Return on Equity in Year 1

## Verification
- [x] TypeScript compilation passes with zero errors (`npx tsc --noEmit`)
- [ ] Manual test with Image 2 values: 25.7m2, 105,000EUR, 17.10EUR/m2 rent, 55% loan at 3.90% interest / 2.00% repayment

## Files Modified
1. `frontend/src/components/Calculators/PropertyEvaluationCalculator/types.ts`
2. `frontend/src/common/constants/propertyEvaluation.ts`
3. `frontend/src/components/Calculators/PropertyEvaluationCalculator/usePropertyEvaluation.ts`
4. `frontend/src/components/Calculators/PropertyEvaluationCalculator/PropertyEvaluationCalculator.tsx`
5. `frontend/src/components/Calculators/PropertyEvaluationCalculator/sections/PropertyInfoSection.tsx`
6. `frontend/src/components/Calculators/PropertyEvaluationCalculator/sections/RentSection.tsx`
7. `frontend/src/components/Calculators/PropertyEvaluationCalculator/sections/OperatingCostsSection.tsx`
8. `frontend/src/components/Calculators/PropertyEvaluationCalculator/sections/FinancingSection.tsx`
9. `frontend/src/components/Calculators/PropertyEvaluationCalculator/sections/EvaluationSection.tsx`
