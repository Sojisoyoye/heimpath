# Plan: Task 47 — Add Area/Neighborhood Selection by Zip Code or Name

## Context

Users currently choose a German state (Bundesland) during the journey wizard, but can't specify a city or neighborhood. This means market data and guidance is state-level only. Adding an optional area/city field to Step 1 (PropertyGoalsForm) lets users narrow their search, making the journey more relevant. The field supports both city name and zip code (PLZ) search with autocomplete.

**No database migration needed** — `property_goals` is a JSONB column. Adding a new key is schema-only.

---

## Changes

### 1. Static city data — German cities dataset

**File:** `frontend/src/common/constants/germanCities.ts` (new)

Create a curated dataset of ~200 German cities (population > ~30K) with:
```typescript
export interface GermanCity {
  name: string      // "München"
  plz: string       // "80331" (representative zip code)
  state: string     // "BY" (state code)
}

export const GERMAN_CITIES: GermanCity[] = [
  { name: "München", plz: "80331", state: "BY" },
  { name: "Berlin", plz: "10115", state: "BE" },
  // ... ~200 entries covering all 16 states
]
```

Each state gets 8-15 cities. Data sourced from well-known German city lists. Re-export from `constants/index.ts`.

### 2. Backend schema — add `preferred_area` field

**File:** `backend/app/schemas/journey.py`

Add to both `PropertyGoals` and `PropertyGoalsUpdate`:
```python
preferred_area: str | None = Field(default=None, max_length=255)
```

### 3. Frontend types — add `preferred_area`

**File:** `frontend/src/models/journey.ts`

Add to both `PropertyGoals` and `PropertyGoalsUpdate` interfaces:
```typescript
preferred_area?: string
```

### 4. Autocomplete component — `AreaAutocomplete`

**File:** `frontend/src/components/Journey/StepContent/AreaAutocomplete.tsx` (new)

Lightweight autocomplete — no new dependencies needed. Uses the existing `Input` component + an absolute-positioned dropdown.

Props:
```typescript
interface IProps {
  value: string
  onChange: (value: string) => void
  stateCode?: string  // filters suggestions to this state
}
```

Behavior:
- Text input with `MapPin` icon
- On type (>= 2 chars): filter `GERMAN_CITIES` by name or PLZ, scoped to `stateCode`
- Show up to 8 matching suggestions in a dropdown
- Clicking a suggestion fills the input with "City (PLZ)"
- User can type free text if their area isn't in the list
- Dropdown closes on blur/selection
- Placeholder: "e.g. München or 80331"

### 5. PropertyGoalsForm — add area field + accept propertyLocation

**File:** `frontend/src/components/Journey/StepContent/PropertyGoalsForm.tsx`

- Add `propertyLocation?: string` to `IProps`
- Add `preferred_area` to local state init and `useEffect` sync
- Insert `<AreaAutocomplete>` after the Property Use field, passing `stateCode={propertyLocation}`
- Include `preferred_area` in the `handleSave` payload

### 6. StepCard — thread propertyLocation to PropertyGoalsForm

**File:** `frontend/src/components/Journey/StepCard.tsx`

Update the `research_goals` entry in `STEP_CONTENT_REGISTRY` to pass `propertyLocation`:
```typescript
research_goals: (p) => (
  <PropertyGoalsForm
    journeyId={p.journeyId}
    initialGoals={p.propertyGoals}
    propertyLocation={p.propertyLocation}
  />
),
```

`propertyLocation` is already available in `IStepContentProps` (line 80).

### 7. Backend tests

**File:** `backend/tests/api/routes/test_journeys.py`

- Test `preferred_area` round-trips through PATCH property-goals and appears in GET detail
- Test `preferred_area` with max_length=255 validation

---

## Files Summary

| # | File | Action |
|---|------|--------|
| 1 | `frontend/src/common/constants/germanCities.ts` | New — city dataset |
| 1b | `frontend/src/common/constants/index.ts` | Modify — re-export |
| 2 | `backend/app/schemas/journey.py` | Modify — add field to 2 schemas |
| 3 | `frontend/src/models/journey.ts` | Modify — add field to 2 interfaces |
| 4 | `frontend/src/components/Journey/StepContent/AreaAutocomplete.tsx` | New — autocomplete component |
| 5 | `frontend/src/components/Journey/StepContent/PropertyGoalsForm.tsx` | Modify — add area field + prop |
| 6 | `frontend/src/components/Journey/StepCard.tsx` | Modify — pass propertyLocation |
| 7 | `backend/tests/api/routes/test_journeys.py` | Modify — add tests |

---

## Verification

1. `cd backend && python -m pytest tests/api/routes/test_journeys.py -x -q` — tests pass
2. `cd frontend && npx tsc -p tsconfig.build.json --noEmit` — no type errors
3. Open journey -> Step 1 -> "Preferred Area" field appears below Property Use
4. Type a city name -> matching suggestions appear, scoped to the journey's state
5. Type a PLZ -> matching zip code suggestions appear
6. Select a suggestion -> input fills with "City (PLZ)"
7. Type free text (not in dataset) -> no error, saves as-is
8. Save & reload -> preferred_area persists
9. Existing journeys without preferred_area -> field shows empty (backward compatible)
