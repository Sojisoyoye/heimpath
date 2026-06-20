# HeimPath Development Guidelines for Claude Code

## Project Overview

**HeimPath** is a German Real Estate Navigator app helping foreign investors and immigrants navigate property buying processes. The platform combines guided journeys, legal knowledge, document translation, and financial calculators.

**Tech Stack:**

- **Frontend:** React + Tailwind CSS
- **Backend:** Python FastAPI + PostgreSQL
- **Infrastructure:** Azure (Container Apps, managed via Terraform)
- **Integrations:** Azure Translator (translation), Stripe (payments)

> For full project architecture, key directories, and file maps see `.claude/skills/codebase-overview/SKILL.md`

---

## Backend Standards (FastAPI)

> Detailed patterns, code templates, and examples: `.claude/skills/backend-standards/SKILL.md`

### Architecture (Separation of Concerns)

- **Schemas** (`schemas/`): Pydantic request/response validation
- **Models** (`models/`): SQLAlchemy ORM models (use `UUIDPrimaryKeyMixin`, `TimestampMixin`, `Base`)
- **Services** (`services/`): Business logic as module-level functions (not classes)
- **Repository** (`repository/`): Database queries and persistence
- **Endpoints** (`api/routes/`): Thin HTTP handlers — delegate to services

### Key Rules

- All endpoints: `async def` with sync DB sessions via `Depends(get_db)`
- `/api/v1/` prefix, resource-oriented plural nouns, proper HTTP methods
- Status codes: 200 (GET/PUT/PATCH), 201 (POST), 204 (DELETE), 400/401/403/404/422/500
- Pydantic schemas with validation, `ConfigDict(from_attributes=True)` for responses
- Alembic for all migrations — never modify DB manually
- Services use `Session` parameter, not injected — module-level functions
- `share_id` pattern: `secrets.token_urlsafe(8)` for shareable resources
- TDD: write test first, don't adjust test to pass
- Never log passwords, API keys, payment info

### Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Files/dirs | snake_case | `translation_service.py` |
| Classes | PascalCase | `PropertyService`, `UserCreateRequest` |
| Functions/vars | snake_case | `validate_german_address()` |
| Private functions | `_` prefix | `_parse_document_metadata()` |
| Booleans | `is_`/`has_`/`can_` | `is_valid_property()` |
| Constants | UPPER_SNAKE_CASE | `MAX_DOCUMENT_SIZE_MB` |

### External Integrations

- **DeepL**: `TranslationService` — cache results, include risk warnings for legal terms
- **Stripe**: `PaymentService` — never log sensitive data, implement idempotency
- **Azure Storage**: used for Terraform state backend (`heimpathtfstate` storage account)

---

## Frontend Standards (React + TypeScript + Tailwind)

> Detailed patterns, code templates, and examples: `.claude/skills/frontend-standards/SKILL.md`

Based on [React-Ts-Best-Practices by seanpmaxwell](https://github.com/seanpmaxwell/React-Ts-Best-Practices).

### Component Rules

- **PascalCase** function declarations (not arrow functions), PascalCase file names
- Type props with `IProps` interface — never use `React.FC` or `any`
- Do NOT specify return type
- Constants outside component, default export at bottom
- Section comments to separate Constants / Components / Functions / Export
- One component per file, under 200 lines; multi-file → folder with `index.tsx`
- Extract child components for related DOM blocks

### State Management — Separate Server vs UI State

| Layer | Tool | Location |
|-------|------|----------|
| Server state | TanStack Query | `hooks/queries/`, `hooks/mutations/` |
| UI state (simple) | `useState` | Component-local |
| UI state (complex) | `useSetState` | Component-local |
| Global state | Context API | `.provider.tsx` files |

- Query keys: factory pattern in `query/queryKeys.ts`
- Mutations: optimistic updates with rollback on error, invalidate related queries on success
- Providers scoped low — avoid unnecessary rerenders

### API Integration

- Singleton service classes using OpenAPI `request()` from `@/client`
- `transformKeys<T>()` (snake→camel) and `transformKeysToSnake()` (camel→snake)
- Centralized paths in `services/common/Paths.ts`
- Toast notifications: `useCustomToast` → `showSuccessToast()` / `showErrorToast()`

### Styling

- Tailwind utilities exclusively — no custom CSS
- Color tokens in `src/common/styles/Colors.ts` — never hardcode hex
- Mobile-first responsive: `sm:`, `md:`, `lg:` prefixes

### Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Files | PascalCase | `PropertyCard.tsx` |
| Props interface | `IProps` / `I[Name]Props` | `IPropertyCardProps` |
| Callback params (simple) | Short | `v`, `err` |
| Callback params (complex) | Descriptive | `propertyValue`, `validationError` |

---

## Key Development Patterns

### Guided Journey

- Immutable phases: Research → Preparation → Buying → Closing
- Personalize by user citizenship and property situation
- Track completion per user/property, provide next-step recommendations

### Document Translation

- Upload German document → extract/translate via DeepL
- Flag financial/legal terms requiring manual review
- Return with confidence scores and risk warnings

### Financial Calculators

- Accept property price + cost factors → compute total ownership cost
- Break down by category (taxes, notary, agent, etc.)
- Compare with market averages
- Save/share via `share_id` pattern

---

## General Development Rules

### Code Quality

**DO:**
- Self-documenting code with clear names
- Comments only for "why", not "what"
- Small, single-purpose functions (< 50 lines)
- Type hints everywhere (Python and TypeScript)
- Tests for business logic
- User-friendly error messages
- Descriptive commit messages

**DON'T:**
- Commented-out code
- Magic numbers — extract to constants
- Skip error handling
- Hardcode configuration values
- Log sensitive information

### Git Workflow

**Never push directly to `main`** — branch protection is enforced on GitHub.

**Flow:** feature branch → commit → push → PR → CI passes → code review (code-reviewer skill) → merge

**Branch naming:** `feature/`, `bugfix/`, `refactor/`, `infra/`, `chore/` + descriptive slug

**Commits:** Conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, `infra:`), lowercase subject, max 72 chars

### Environment

- Never commit `.env`, API keys, passwords, database credentials
- Use `.env.example` with placeholders

### Documentation

- Docstrings for all public functions/classes, complex algorithms, and integration points

---

## Integration Checklist

When implementing new features:

- [ ] Define API schema (Pydantic models)
- [ ] Create database model and migration
- [ ] Implement repository/data access layer
- [ ] Write service business logic
- [ ] Create API endpoint with proper status codes
- [ ] Add input validation and error handling
- [ ] Do TDD
- [ ] Write unit and integration tests
- [ ] Create React component with TypeScript types
- [ ] Connect frontend to API service
- [ ] Add loading states and error messages
- [ ] Test with actual DeepL/Stripe/AWS if applicable
- [ ] Update documentation

---

## Workflow Orchestration

> Extracted to `.claude/skills/workflow-orchestration/SKILL.md` — Claude loads this automatically when relevant.

---

## Resources & References

- FastAPI Docs: https://fastapi.tiangolo.com/
- SQLAlchemy Async: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- React Best Practices: https://react.dev/learn
- Tailwind CSS: https://tailwindcss.com/docs
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- DeepL API: https://developers.deepl.com/docs/api-reference
- Stripe Integration: https://stripe.com/docs/api
- AWS SDK (aioboto3): https://aioboto3.readthedocs.io/
