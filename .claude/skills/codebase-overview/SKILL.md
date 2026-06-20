---
name: codebase-overview
description: Provides a comprehensive overview of the HeimPath project architecture, key directories, naming conventions, and patterns. Use this skill when you need to understand the project structure before making changes, instead of spending tokens reading multiple files.
---

# HeimPath Codebase Overview

HeimPath is a German Real Estate Navigator helping foreign investors navigate property buying. Monorepo with a **FastAPI + PostgreSQL** backend and a **React + TypeScript + Tailwind** frontend.

---

## Top-Level Structure

```
heimpath/
├── backend/           # FastAPI backend (Python 3.10+)
├── frontend/          # React + Vite frontend (TypeScript 5.9+, React 19)
├── .claude/           # Claude Code config & skills
├── tasks/             # Task tracking (todo.md, lessons.md)
├── compose.yml        # Docker Compose (db, adminer, prestart, backend, frontend, nginx)
├── pyproject.toml     # UV workspace config
└── .env               # Root environment variables (not committed)
```

---

## Backend Architecture (`backend/app/`)

**Pattern:** Layered architecture — Routes -> Services -> Repository -> Models

### Directory Map

```
backend/app/
├── main.py                    # FastAPI app entry, CORS, includes api_router
├── api/
│   ├── main.py                # Router aggregation: all routers included at /api/v1
│   ├── deps.py                # Dependency injection (get_db, CurrentUser, AsyncSessionDep)
│   └── routes/                # Route handlers by feature
│       ├── auth.py            # Registration, email verify, token refresh
│       ├── login.py           # Login endpoint
│       ├── users.py           # User CRUD
│       ├── journeys.py        # Guided journey endpoints
│       ├── laws.py            # Legal knowledge base
│       ├── calculators.py     # Hidden costs + ROI calculators
│       ├── documents.py       # Document upload/translation
│       ├── subscriptions.py   # Stripe subscriptions
│       └── translations.py    # Translation endpoints
├── models/                    # SQLAlchemy ORM models
│   ├── __init__.py            # Re-exports all models (backward compat layer)
│   ├── base.py                # Base, UUIDPrimaryKeyMixin, TimestampMixin
│   ├── user.py                # User model (SubscriptionTier enum)
│   ├── journey.py             # Journey, JourneyStep, JourneyTask + enums
│   ├── legal.py               # Law, LawCategory, LawBookmark, CourtRuling, StateVariation
│   ├── calculator.py          # HiddenCostCalculation
│   ├── roi.py                 # ROICalculation
│   └── document.py            # Document, DocumentTranslation + enums
├── schemas/                   # Pydantic request/response schemas
│   ├── auth.py, user.py, journey.py, legal.py
│   ├── calculator.py          # Hidden cost schemas
│   ├── roi.py                 # ROI calculator schemas
│   └── document.py, translation.py
├── services/                  # Business logic (module-level functions)
│   ├── calculator_service.py  # Hidden cost calculations + CRUD
│   ├── roi_service.py         # ROI calculations, grading, projections, CRUD
│   ├── legal_service.py       # Search, bookmark, filtering
│   ├── document_service.py    # Upload, translation orchestration
│   ├── journey_service.py     # Step progression
│   ├── payment_service.py     # Stripe integration
│   └── translation_service.py # Azure translation
├── repository/                # Data access layer
│   └── base.py, user_repository.py
├── core/
│   ├── config.py              # Pydantic Settings (reads ../.env)
│   ├── db.py                  # Sync engine (Alembic, init_db)
│   ├── database.py            # Async engine (AsyncSessionLocal)
│   └── security.py            # JWT, password hashing, OAuth2
├── alembic/versions/          # 17 migration files
├── crud.py                    # Legacy CRUD utilities
└── seed_laws.py               # Seeds German legal knowledge base
```

### Route Registration

`backend/app/api/main.py` aggregates all routers:

```python
api_router = APIRouter()
api_router.include_router(auth.router)        # /auth
api_router.include_router(login.router)       # /login
api_router.include_router(users.router)       # /users
api_router.include_router(journeys.router)    # /journeys
api_router.include_router(laws.router)        # /laws
api_router.include_router(calculators.router) # /calculators
api_router.include_router(documents.router)   # /documents
api_router.include_router(subscriptions.router) # /subscriptions
# Mounted at /api/v1 in main.py
```

Each route file: `router = APIRouter(prefix="/feature", tags=["feature"])`

### Database

- **Sync engine** (`core/db.py`): `postgresql+psycopg://` — for Alembic & legacy CRUD
- **Async engine** (`core/database.py`): `postgresql+asyncpg://` — for async endpoints
- **Models inherit**: `UUIDPrimaryKeyMixin` + `TimestampMixin` + `Base`
- **Migrations**: Alembic (`alembic upgrade head`)
- **Docker**: PostgreSQL 18 via `compose.yml`

### Service Pattern

Services use module-level functions (not classes), matching `calculator_service.py` pattern:

```python
# services/some_service.py
def calculate(...) -> Result: ...
def save_calculation(session, user_id, inputs) -> Model: ...
def get_by_share_id(session, share_id) -> Model: ...
def list_user_calculations(session, user_id) -> list[Model]: ...
```

Uses `sqlmodel.Session` with `session.exec()`, `session.add()`, `session.commit()`, `session.refresh()`.

---

## Frontend Architecture (`frontend/src/`)

**Router:** TanStack Router (file-based, auto code-splitting)
**State:** TanStack Query (server state) + useState/useContext (UI state)
**UI Library:** shadcn/ui (Radix primitives + Tailwind)

### Directory Map

```
frontend/src/
├── routes/                    # TanStack Router file-based routes
│   ├── __root.tsx             # Root layout
│   ├── _layout.tsx            # App layout (sidebar, navbar)
│   ├── login.tsx, signup.tsx  # Public routes
│   └── _layout/               # Protected routes
│       ├── index.tsx          # Dashboard /
│       ├── calculators.tsx    # /calculators
│       ├── settings.tsx       # /settings
│       ├── laws/              # /laws, /laws/:lawId, /laws/bookmarks
│       ├── journeys/          # /journeys, /journeys/new, /journeys/:id
│       └── documents/         # /documents, /documents/:id
├── components/                # React components by feature
│   ├── Calculators/           # HiddenCostsCalculator, ROICalculator, StateComparison
│   ├── Legal/                 # LawCard, LawDetail, BookmarkButton
│   ├── Documents/             # Document upload/translation UI
│   ├── Journey/               # Guided journey UI + StepContent/
│   ├── Sidebar/               # AppSidebar, Main, User
│   ├── Profile/, UserSettings/, Admin/, Items/
│   └── ui/                    # 27 shadcn/ui components (button, card, input, dialog, etc.)
├── models/                    # TypeScript domain interfaces
│   ├── calculator.ts          # HiddenCost + ROI interfaces
│   ├── legal.ts               # LawSummary, LawDetail, LawCategory
│   ├── journey.ts, user.ts, document.ts
│   └── index.ts               # Re-exports
├── hooks/
│   ├── useAuth.ts, useCustomToast.ts, useMobile.ts
│   ├── queries/               # TanStack Query hooks (useCalculatorQueries, useLegalQueries, etc.)
│   └── mutations/             # TanStack mutation hooks (useCalculatorMutations, useLegalMutations, etc.)
├── services/                  # API integration layer
│   ├── common/
│   │   ├── API/client.ts      # Axios client with auth interceptors
│   │   └── Paths.ts           # Centralized endpoint paths (PATHS constant)
│   ├── CalculatorService.ts   # Hidden cost + ROI API calls
│   ├── LegalService.ts, DocumentService.ts, JourneyService.ts
│   └── index.ts               # Re-exports
├── query/
│   ├── client.ts              # QueryClient config (staleTime, gcTime, retry)
│   └── queryKeys.ts           # Query key factory (users, journeys, laws, calculators, documents, dashboard)
├── common/
│   ├── constants/index.ts     # App-wide constants (GERMAN_STATES, LAW_CATEGORIES, COST_DEFAULTS)
│   ├── utils/                 # Utility functions (cn, etc.)
│   └── styles/Colors.ts       # Color tokens
├── client/                    # OpenAPI generated client (request.ts)
├── routeTree.gen.ts           # AUTO-GENERATED by TanStack Router (DO NOT EDIT)
└── App.tsx, index.tsx         # App root & entry point
```

### API Service Pattern

Services are singleton class instances using the OpenAPI `request()` helper:

```typescript
// services/SomeService.ts
class SomeServiceClass {
  async getItem(id: string): Promise<Item> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.SOME.DETAIL(id),
    });
    return transformKeys<Item>(response); // snake_case -> camelCase
  }
}
export const SomeService = new SomeServiceClass();
```

Key helpers in `CalculatorService.ts`: `transformKeys<T>()` (snake->camel) and `transformKeysToSnake()` (camel->snake).

### Query/Mutation Hook Pattern

```typescript
// hooks/queries/useSomeQueries.ts
export function useSomething(id: string) {
  return useQuery({
    queryKey: queryKeys.feature.detail(id),
    queryFn: () => SomeService.getItem(id),
    enabled: !!id,
  });
}

// hooks/mutations/useSomeMutations.ts
export function useCreateSomething() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInput) => SomeService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feature.list() });
    },
  });
}
```

### Component Pattern

```typescript
interface IProps { ... }

const SOME_CONSTANT = ...

function ChildComponent(props: { item: Item }) { ... }

/** Default component. Description here. */
function MainComponent(props: IProps) { ... }

export default MainComponent;
// or: export { MainComponent }
```

- Function declarations (not arrow functions)
- `IProps` for props interface
- Constants outside component
- Parent declared first, children above default export
- Toast: `useCustomToast()` -> `showSuccessToast()` / `showErrorToast()`

---

## Naming Conventions

### Backend (Python)

| What | Convention | Examples |
|------|-----------|----------|
| Files/folders | snake_case | `calculator_service.py`, `roi.py` |
| Classes | PascalCase | `ROICalculation`, `HiddenCostCalculation` |
| Functions | snake_case | `calculate_roi()`, `get_by_share_id()` |
| Constants | UPPER_SNAKE_CASE | `STATE_RATES`, `COST_DEFAULTS` |
| Enums | PascalCase class, UPPER values | `class PropertyType(str, Enum)` |
| Private | _prefix | `_score_gross_yield()` |

### Frontend (TypeScript)

| What | Convention | Examples |
|------|-----------|----------|
| Component files | PascalCase.tsx | `ROICalculator.tsx`, `LawCard.tsx` |
| Utility files | camelCase.ts | `queryKeys.ts`, `useAuth.ts` |
| Components | PascalCase function | `function ROICalculator(props: IProps)` |
| Props interfaces | `IProps` or `I[Name]Props` | `interface IProps { ... }` |
| Hooks | camelCase with `use` prefix | `useROICalculation`, `useCustomToast` |
| Services | PascalCase class + singleton | `class CalculatorServiceClass` / `export const CalculatorService` |
| Models/interfaces | PascalCase | `ROICalculation`, `LawSummary` |
| Constants | UPPER_SNAKE_CASE | `CURRENCY_FORMATTER`, `GRADE_COLORS` |
| Query keys | camelCase factory | `queryKeys.calculators.roi(id)` |

### API Conventions

| Pattern | Convention |
|---------|-----------|
| URL prefix | `/api/v1/` |
| Resource URLs | Plural nouns: `/calculators/roi`, `/laws`, `/documents` |
| Path params | `/{resource_id}` |
| Share endpoints | `/share/{share_id}` (no auth) |
| Compare endpoints | `/compare` (POST with body) |
| Endpoint paths (FE) | `PATHS.FEATURE.ACTION` in `services/common/Paths.ts` |
| Response keys | snake_case from API, transformed to camelCase in frontend |

---

## Key Integrations

| Integration | Backend Location | Notes |
|-------------|-----------------|-------|
| PostgreSQL | `core/db.py` + `core/database.py` | Sync + async engines |
| Alembic | `alembic/versions/` | 17 migrations, sequential chain |
| Stripe | `services/payment_service.py` | Subscription management |
| Azure Translation | `services/translation_service.py` | Document translation |
| JWT Auth | `core/security.py` + `api/deps.py` | OAuth2PasswordBearer |
| Sentry | `main.py` | Error tracking |

## Docker Services (compose.yml)

| Service | Description |
|---------|-------------|
| `db` | PostgreSQL 18 |
| `adminer` | Database UI |
| `prestart` | Run migrations before backend |
| `backend` | FastAPI app |
| `frontend` | Vite dev server |
| `nginx` | Reverse proxy |
