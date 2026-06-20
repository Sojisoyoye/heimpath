# Task #66: Mortgage Pre-Qualification for Non-Citizens

## Context

The Financing Wizard already has citizenship-aware scoring (5 residency statuses, adjusted down payment %, document checklists). However, it lacks:
- **Bank compatibility indicator** — which banks accept which residency categories
- **Financing tips per citizenship** — actionable advice tailored to each status
- **Better residency labels** — current labels don't mention German legal terms (Niederlassungserlaubnis, Aufenthaltserlaubnis)
- **Correct non-resident down payment** — task requires 40% for non-residents, but current logic gives them 30% (same as temporary residents)
- **Non-resident-specific documents** — tax returns from home country, international bank statements

No new models, schemas, or migrations needed — purely scoring logic adjustments + new UI sections.

---

## Files to Modify (4)

| # | File | Change |
|---|------|--------|
| 1 | `frontend/src/components/Calculators/FinancingWizard.tsx` | Update labels, scoring, add BankCompatibility + FinancingTips sections |
| 2 | `backend/app/services/financing_service.py` | Mirror scoring/advisory changes to keep frontend and backend in sync |
| 3 | `frontend/src/models/calculator.ts` | Update `FinancingResidencyStatus` to add `non_resident` value |
| 4 | `backend/app/schemas/financing.py` | Update `residency_status` validator to accept `non_resident` |

**Note:** `non_eu` → `non_resident` rename to clarify intent. Keep `non_eu` as a valid alias in the backend validator for backward compatibility with existing saved assessments.

---

## Implementation Details

### 1. Rename `non_eu` → `non_resident` + update labels

**Frontend `FinancingResidencyStatus`** (models/calculator.ts):
```typescript
export type FinancingResidencyStatus =
  | "german_citizen"
  | "eu_citizen"
  | "permanent_resident"   // Non-EU with Niederlassungserlaubnis
  | "temporary_resident"   // Non-EU with Aufenthaltserlaubnis
  | "non_resident"         // Buying from abroad (rename from non_eu)
```

**Updated `RESIDENCY_OPTIONS` labels** (FinancingWizard.tsx):
```typescript
const RESIDENCY_OPTIONS = [
  { value: "german_citizen", label: "German Citizen" },
  { value: "eu_citizen", label: "EU Citizen (living in Germany)" },
  { value: "permanent_resident", label: "Permanent Resident (Niederlassungserlaubnis)" },
  { value: "temporary_resident", label: "Temporary Resident (Aufenthaltserlaubnis)" },
  { value: "non_resident", label: "Non-Resident (buying from abroad)" },
]
```

**Backend**: Accept both `non_eu` and `non_resident` in the schema validator. Map `non_eu` → `non_resident` internally for scoring. All new assessments save `non_resident`.

### 2. Adjust down payment recommendations

Per task requirements: residents 20%, non-EU residents 30%, non-residents 40%.

**Frontend `recommendedDpPercent` update:**
```typescript
function recommendedDpPercent(residency, schufa): number {
  let base = 20
  if (residency === "permanent_resident" || residency === "temporary_resident") base = 30
  if (residency === "non_resident") base = 40
  if (schufa === "poor" || schufa === "unknown") base += 5
  if (residency === "german_citizen" && (schufa === "excellent" || schufa === "good")) base = 15
  return Math.min(base, 50)
}
```

**Backend `_recommended_dp_percent` update:** Mirror the same logic.

### 3. Adjust residency scoring

Widen the gap between permanent residents and non-residents:
```
german_citizen:     15 (unchanged)
eu_citizen:         13 (unchanged)
permanent_resident: 10 (was 11)
temporary_resident:  6 (unchanged)
non_resident:        2 (was 4 for non_eu)
```

### 4. Add Bank Compatibility section (frontend only)

New `BANK_COMPATIBILITY` constant and `BankCompatibility` component in FinancingWizard.tsx.

```typescript
const BANK_COMPATIBILITY: Record<FinancingResidencyStatus, {
  compatible: string[]
  limited: string[]
  unlikely: string[]
  note: string
}> = {
  german_citizen: {
    compatible: ["All major banks", "Sparkassen", "Volksbanken", "Online banks"],
    limited: [],
    unlikely: [],
    note: "Full access to all German mortgage products.",
  },
  eu_citizen: {
    compatible: ["Deutsche Bank", "Commerzbank", "Sparkassen", "ING"],
    limited: ["Some online-only banks"],
    unlikely: [],
    note: "Most banks treat EU citizens similarly to German citizens if registered in Germany.",
  },
  permanent_resident: {
    compatible: ["Deutsche Bank", "Commerzbank", "Sparkassen"],
    limited: ["ING", "Volksbanken"],
    unlikely: ["Most online-only banks"],
    note: "Niederlassungserlaubnis significantly improves eligibility. Expect extra documentation.",
  },
  temporary_resident: {
    compatible: ["Deutsche Bank", "Commerzbank"],
    limited: ["Sparkassen", "Hypovereinsbank"],
    unlikely: ["ING", "Online banks", "Volksbanken"],
    note: "Banks assess permit expiry date — longer remaining validity improves approval odds.",
  },
  non_resident: {
    compatible: [],
    limited: ["Deutsche Bank (international clients)", "Commerzbank"],
    unlikely: ["Sparkassen", "ING", "Online banks", "Volksbanken"],
    note: "Very few banks lend to non-residents. Expect 40%+ down payment and higher rates. Consider using a German mortgage broker.",
  },
}
```

Displayed as a card after "Loan Estimates" when results are visible, with colored indicators (green=compatible, amber=limited, red=unlikely).

### 5. Add Financing Tips section (frontend only)

New `FINANCING_TIPS` constant and `FinancingTips` component:

```typescript
const FINANCING_TIPS: Record<FinancingResidencyStatus, string[]> = {
  german_citizen: [
    "Compare rates from at least 3 banks — Sparkassen, direct banks, and your Hausbank",
    "Consider KfW loans for energy-efficient properties (lower rates, up to €150k)",
    "Negotiate Sondertilgungsrecht (extra repayment rights) — aim for 5-10% annually",
  ],
  eu_citizen: [
    "Register at the Einwohnermeldeamt before applying — banks require German address",
    "Open a German bank account (Girokonto) at least 3 months before applying",
    "Get your SCHUFA started early — new to Germany means no credit history",
  ],
  permanent_resident: [
    "Your Niederlassungserlaubnis is your strongest asset — highlight it in applications",
    "Provide translated and certified documents from your home country",
    "Consider a German mortgage broker (Finanzierungsberater) who works with non-EU clients",
  ],
  temporary_resident: [
    "Apply before your permit expires — banks want at least 2 years remaining validity",
    "If possible, apply for Niederlassungserlaubnis first — it dramatically improves terms",
    "Have your employer provide a letter confirming ongoing employment intent",
    "Consider Interhyp or Dr. Klein — brokers experienced with temporary residents",
  ],
  non_resident: [
    "Engage a German mortgage broker who specializes in non-resident financing",
    "Prepare tax returns from your home country (translated and notarized)",
    "Consider opening a German bank account and making regular deposits before applying",
    "Some banks require you to visit Germany in person for the loan signing",
    "Factor in currency exchange risk if your income is not in EUR",
  ],
}
```

Displayed as a card after Bank Compatibility when results are visible.

### 6. Enhance document checklist for non-residents

Add these docs when `residencyStatus === "non_resident"`:
- "Tax returns from home country — last 2 years (translated and notarized)"
- "International bank statements — last 6 months"
- "Proof of address in home country"
- "Power of attorney for German representative (if applicable)"

Update both frontend `buildDocumentChecklist` and backend `_build_document_checklist`.

### 7. Update backend for backward compatibility

In `backend/app/schemas/financing.py`, update the validator for `residency_status`:
- Accept `non_resident` as the primary value
- Map incoming `non_eu` → `non_resident` with a validator for backward compat

In `backend/app/services/financing_service.py`:
- All scoring functions use `non_resident` as the key
- Also handle `non_eu` as a fallback for existing DB rows

---

## Implementation Order

1. Update `FinancingResidencyStatus` type in `models/calculator.ts`
2. Update backend schema validator (`schemas/financing.py`) for backward compat
3. Update backend scoring functions (`financing_service.py`)
4. Update frontend scoring/labels/docs in `FinancingWizard.tsx`
5. Add `BankCompatibility` component in `FinancingWizard.tsx`
6. Add `FinancingTips` component in `FinancingWizard.tsx`
7. Run `pytest`, `tsc --noEmit`, `pre-commit run --all-files`

---

## Verification

1. `python -m pytest backend/tests/ -v` — all tests pass (backend scoring matches)
2. `cd frontend && bunx tsc --noEmit` — no type errors
3. `pre-commit run --all-files` — biome + ruff pass
4. Manual: select "Non-Resident" → verify 40% down payment, bank compatibility shows limited/unlikely, tips shown
5. Manual: select "Permanent Resident" → verify 30% down payment, different bank compatibility
6. Manual: select "German Citizen" → verify 20% (or 15% with excellent SCHUFA)
7. Existing saved assessments with `non_eu` still load correctly
