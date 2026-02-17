# ROI Calculator — Backend + Frontend Wiring

## Context
Task #6: Add backend persistence, investment grade scoring, 10-year projections, comparison, and save/share for the ROI Calculator. The **frontend calculator UI already exists** (`ROICalculator.tsx`) and works client-side with 5-year projections. This plan adds: save/retrieve calculations, shareable links, investment grade scoring (0-10), 10-year projections, ROI comparison, and wires the frontend to the API.

**Architecture decisions:**
- **Extend existing files** — add ROI routes to `calculators.py`, ROI methods to `CalculatorService.ts`, ROI hooks to existing hook files (no new router/service files needed)
- **Sync DB** (matches hidden costs pattern)
- **`share_id`** via `secrets.token_urlsafe(8)` — same pattern as hidden costs
- **Store inputs + results + projections** — projections stored as JSON column (10 year-rows per calculation)
- **Investment grade** computed server-side and stored as frozen result
- **Separate service file** `roi_service.py` to keep calculator_service.py focused on hidden costs

## Backend Changes

### Step 1: Model — `backend/app/models/roi.py` (new)
- [ ] Table `roi_calculation` using `UUIDPrimaryKeyMixin`, `TimestampMixin`, `Base`
- [ ] `user_id` UUID FK→user.id (nullable), indexed
- [ ] `name` String(255) nullable, `share_id` String(12) unique indexed nullable
- [ ] Inputs: `purchase_price`, `down_payment`, `monthly_rent`, `monthly_expenses`, `annual_appreciation`, `vacancy_rate`, `mortgage_rate` (Float), `mortgage_term` (Integer)
- [ ] Results: `gross_rental_income`, `net_operating_income`, `annual_cash_flow`, `monthly_mortgage_payment`, `gross_yield`, `net_yield`, `cap_rate`, `cash_on_cash_return`, `investment_grade` (Float 0-10), `investment_grade_label` String(20)
- [ ] `projections` JSON column — array of 10 year objects
- [ ] Update `backend/app/models/__init__.py` — add `ROICalculation`

### Step 2: Migration — `backend/app/alembic/versions/h8c9d0e1f2g3_add_roi_calculation_table.py` (new)
- [ ] `down_revision = 'g7b8c9d0e1f2'`
- [ ] Create `roi_calculation` table with indexes on `user_id` and `share_id` (unique)
- [ ] `projections` column as `sa.JSON` type

### Step 3: Schemas — `backend/app/schemas/roi.py` (new)
- [ ] `ROICalculationCreate` — inputs with validation (price > 0, rates 0-100, term 5-40)
- [ ] `ProjectionYear` — year, property_value, equity, cumulative_cash_flow, total_return, total_return_percent
- [ ] `ROICalculationResponse` — full response with all fields + created_at
- [ ] `ROICalculationSummary` — list view: id, name, share_id, purchase_price, investment_grade, investment_grade_label, annual_cash_flow, created_at
- [ ] `ROICalculationListResponse` — data + count
- [ ] `ROICompareRequest` — list of ROICalculationCreate (2-4 scenarios)
- [ ] `ROICompareResponse` — list of inline result objects

### Step 4: Service — `backend/app/services/roi_service.py` (new)
- [ ] `calculate_mortgage_payment(principal, annual_rate, term_years)` → float
- [ ] `calculate_roi(inputs)` → `ROIBreakdown` with all metrics + investment grade
- [ ] Investment grade scoring (0-10 weighted): gross yield (25%), cap rate (25%), cash-on-cash (25%), cash flow positive (15%), vacancy buffer (10%)
- [ ] Grade labels: 8-10 "Excellent", 6-7.9 "Good", 4-5.9 "Moderate", 2-3.9 "Poor", 0-1.9 "Very Poor"
- [ ] `calculate_projections(inputs, annual_cash_flow)` → 10 years with equity buildup, cumulative cash flow, property value
- [ ] CRUD: `save_calculation`, `get_calculation`, `get_by_share_id`, `list_user_calculations`, `delete_calculation`
- [ ] `compare_scenarios(inputs_list)` → pure calculation, no persistence

### Step 5: Routes — `backend/app/api/routes/calculators.py` (edit)
- [ ] POST `/roi/compare` (No auth, 200)
- [ ] POST `/roi` (Auth, 201)
- [ ] GET `/roi` (Auth, 200 — user's saved list)
- [ ] GET `/roi/share/{share_id}` (No auth, 200)
- [ ] GET `/roi/{calc_id}` (Auth, 200)
- [ ] DELETE `/roi/{calc_id}` (Auth, 204)

## Frontend Changes

### Step 6: Models — `frontend/src/models/calculator.ts` (edit)
- [ ] `ROICalculationInput` — all input fields + name?
- [ ] `ProjectionYear` — year, propertyValue, equity, cumulativeCashFlow, totalReturn, totalReturnPercent
- [ ] `ROICalculation` — full response with all inputs, results, investmentGrade, investmentGradeLabel, projections
- [ ] `ROICalculationSummary` — summary for list views

### Step 7: Service — `frontend/src/services/CalculatorService.ts` (edit)
- [ ] `saveROICalculation(input)`, `getROICalculation(id)`, `getROIByShareId(shareId)`, `getUserROICalculations()`, `deleteROICalculation(id)`, `compareROIScenarios(inputs[])`

### Step 8: Query keys — `frontend/src/query/queryKeys.ts` (edit)
- [ ] Add `roiList`, `roiShare` keys (note: `roi(id)` already exists)

### Step 9: Query hooks — `frontend/src/hooks/queries/useCalculatorQueries.ts` (edit)
- [ ] `useROICalculation(id)`, `useROIByShareId(shareId)`, `useUserROICalculations()`

### Step 10: Mutation hooks — `frontend/src/hooks/mutations/useCalculatorMutations.ts` (edit)
- [ ] `useSaveROICalculation()`, `useDeleteROICalculation()`, `useCompareROIScenarios()`

### Step 11: Update `ROICalculator.tsx` (edit)
- [ ] 10-year projections (change from 5 to 10)
- [ ] Investment grade badge (colored, mirrors backend scoring algorithm)
- [ ] Save section — name input + "Save" button
- [ ] Share section — copy-to-clipboard URL using share_id
- [ ] Saved Calculations section — summary cards with grade badge, share link, delete

## Files Summary

| # | File | Action |
|---|------|--------|
| 1 | `backend/app/models/roi.py` | new |
| 1b | `backend/app/models/__init__.py` | edit |
| 2 | `backend/app/alembic/versions/h8c9d0e1f2g3_...py` | new |
| 3 | `backend/app/schemas/roi.py` | new |
| 4 | `backend/app/services/roi_service.py` | new |
| 5 | `backend/app/api/routes/calculators.py` | edit |
| 6 | `frontend/src/models/calculator.ts` | edit |
| 7 | `frontend/src/services/CalculatorService.ts` | edit |
| 8 | `frontend/src/query/queryKeys.ts` | edit |
| 9 | `frontend/src/hooks/queries/useCalculatorQueries.ts` | edit |
| 10 | `frontend/src/hooks/mutations/useCalculatorMutations.ts` | edit |
| 11 | `frontend/src/components/Calculators/ROICalculator.tsx` | edit |

## Verification
- [ ] `npx tsc --noEmit` — frontend compiles with 0 errors
- [ ] Backend imports verify: `from app.models.roi import ROICalculation; from app.services import roi_service; from app.schemas.roi import *`
- [ ] `docker compose up --build -d` → migration runs
- [ ] ROI compare endpoint works (no auth)
- [ ] Save ROI calculation → appears in saved list with investment grade badge
- [ ] Share link works in incognito (no auth)
- [ ] 10-year projections table renders all 10 rows
- [ ] Delete ROI calculation works
