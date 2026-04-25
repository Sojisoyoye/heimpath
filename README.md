# HeimPath - German Real Estate Navigator

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/Sojisoyoye/heimpath/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/Sojisoyoye/heimpath/tree/main)
[![codecov](https://codecov.io/gh/Sojisoyoye/heimpath/graph/badge.svg)](https://codecov.io/gh/Sojisoyoye/heimpath)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Sojisoyoye_heimpath&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Sojisoyoye_heimpath)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Sojisoyoye_heimpath&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Sojisoyoye_heimpath)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)

HeimPath is a comprehensive platform helping foreign investors and immigrants navigate the German property buying process. The platform combines guided journeys, legal knowledge, document translation, and financial calculators to make property buying in Germany accessible and transparent.

## Environments

| Environment | URL | Deploys from |
|-------------|-----|--------------|
| Production | https://heimpath.com | Manual (`workflow_dispatch` with image tag) |
| Staging | https://staging.heimpath.com | Automatic on push to `main` |
| Local | http://localhost:5173 (frontend), http://localhost:8000 (backend) | `docker compose up` |

## Features

### Guided Property Journeys

Personalised step-by-step guidance through the German property buying process.

- 4 phases: Research → Preparation → Buying → Closing
- 15+ steps tailored by citizenship, property type, and financing method
- Separate paths for **live-in buyers**, **rental investors**, and **renters**
- Task checklists, document upload, and progress tracking per step
- Market insights auto-generated when the research phase is completed
- Calculator CTAs surfaced at relevant steps (financing, buying costs, etc.)
- Post-purchase **Ownership Onboarding** phase (Grundbucheintrag, insurance, utilities)
- Phase completion banners and portfolio CTA on journey completion

### Financial Calculators (12 tabs)

All calculators are available without login at `/tools/*` for public access.

| Calculator | Description |
|------------|-------------|
| **Hidden Costs** | Acquisition costs broken down by category (Grunderwerbsteuer, Notar, Makler) with state-specific rates. Branded PDF export. |
| **ROI Calculator** | Rental yield and after-tax cash flow, 10-year projection chart, saved calculations, Mietspiegel CTA. |
| **State Comparison** | Compare land transfer tax, notary fees, and market indicators across all 16 states. |
| **Financing Wizard** | Mortgage pre-qualification tailored to non-residents: required documents, LTV limits, lender options. |
| **Property Evaluation** | Spec-compliant valuation using income capitalisation and comparative methods; average rent/sqm by state; shareable links; PDF export. |
| **GmbH vs. Private** | Side-by-side tax and exit comparison for holding property personally vs. through a GmbH. |
| **Mortgage Amortisation** | Full amortisation schedule with total interest, early repayment comparison, and 10-year sale profit estimator. |
| **City Comparison** | Price-per-sqm, rental yield, and market trend data across German cities and districts. |
| **Cross-Border Tax Guide** | Double-taxation treaty implications for investors from 20+ countries. |
| **Mortgage Eligibility** | Non-citizen eligibility guide covering bank criteria, required documents, and typical approval conditions. |
| **Rent Estimate** | Mietspiegel-based monthly rent estimate by postcode, apartment size, and construction year. Pre-fills ROI Calculator. |
| **Exit Tax (§ 23 EStG)** | Speculation tax calculator: shows capital-gains tax liability on sales within 10 years, exemption detection, and 12-year net proceeds chart. |

### Professional Network

- Directory of verified bilingual Makler, notaries, lawyers, and tax advisors
- Structured reviews with star ratings and verified buyer badges
- Contact inquiry form sent directly to professionals
- Save/favourite professionals for quick access
- Admin CRUD back-office for managing listings

### Portfolio Management

- Track owned properties with purchase price, current value, and equity
- Log rental income, Hausgeld, and maintenance expenses (Nebenkosten tracker)
- 12-month income vs. expenses performance chart
- Budget gauge and days-to-target countdown on the dashboard

### Contract & Document Intelligence

- **AI Kaufvertrag Explainer** — Upload a German purchase contract for clause-by-clause analysis with plain-English explanations and risk annotations
- **Purchase Price Extraction** — Automatically detects the purchase price and bridges it to the Property Evaluation calculator
- **Document Translation** — Azure Translator-powered translation with risk warnings for legal/financial terms and confidence scores
- **Document Management** — Upload, filter, share, and delete documents per journey step

### Legal Knowledge Base

50+ German real estate laws translated into plain English.

- Full-text search and category filtering
- Court rulings and state-specific variations
- Bookmark functionality for quick reference
- Laws automatically surfaced at relevant journey steps

### Discovery & Content

- **Global Search** — `Cmd+K` / `Ctrl+K` command palette searches laws, articles, professionals, and glossary terms
- **Interactive Glossary** — 200+ German real estate terms with definitions, examples, and categories
- **Content Library** — SEO-optimised articles linked to relevant journey steps
- **SEO** — Meta tags, Open Graph, Twitter cards, and JSON-LD structured data on all public pages

### Dashboard

- Active journey progress (ring chart), recent activity timeline
- Budget gauge and days-to-target countdown
- Personalised recommendations
- Portfolio performance summary

### Notifications

- In-app notifications with read/unread tracking
- Per-category notification preferences
- Email notifications and opt-in weekly digest

### Technical Features

- **Authentication & Authorization**
  - JWT-based authentication with email verification
  - Password recovery
  - GDPR-compliant data export and account deletion

- **Subscription Management**
  - Stripe integration for premium features
  - Multiple subscription tiers

## Technology Stack

### Backend
- **FastAPI** - Modern, fast Python web framework
- **PostgreSQL** - Robust SQL database with full-text search
- **SQLModel/SQLAlchemy** - Python ORM
- **Pydantic** - Data validation and settings management
- **Alembic** - Database migrations
- **Pytest** - Testing framework

### Frontend
- **React** - Frontend library
- **TypeScript** - Type-safe JavaScript
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool

### Infrastructure
- **Azure Container Apps** - Cloud hosting (staging and production)
- **Docker Compose** - Local development and container orchestration
- **GHCR** - Container image registry
- **GitHub Actions** - CI/CD pipelines
- **Sentry** - Error monitoring (optional)

### Integrations
- **Stripe** - Payment processing
- **Azure Translator** - Document translation

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.10+ (for backend development)

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/Sojisoyoye/heimpath.git
cd heimpath
```

2. Copy the environment file and configure:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the development environment:
```bash
docker compose up -d
```

4. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Environment Variables

Key environment variables to configure:

| Variable | Description |
|----------|-------------|
| `DOMAIN` | Domain for the application (default: `localhost`) |
| `FRONTEND_HOST` | Frontend URL for email links |
| `ENVIRONMENT` | `local`, `staging`, or `production` |
| `SECRET_KEY` | JWT secret key |
| `POSTGRES_PASSWORD` | Database password |
| `FIRST_SUPERUSER` | Admin email |
| `FIRST_SUPERUSER_PASSWORD` | Admin password |
| `STRIPE_SECRET_KEY` | Stripe API key (optional) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret (optional) |
| `SENTRY_DSN` | Sentry DSN for error tracking (optional) |
| `AZURE_TRANSLATOR_KEY` | Azure Translator API key (optional) |
| `AZURE_TRANSLATOR_REGION` | Azure Translator region (optional) |

See `.env.example` for the full list.

## CI/CD

### Pipelines

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **Test Backend** | Push to `main`, PRs | Runs backend test suite |
| **Pre-commit** | PRs | Linting and formatting checks |
| **Playwright** | PRs | End-to-end tests |
| **Security Scan** | PRs | Dependency vulnerability scanning |
| **Deploy Staging** | Push to `main` | Builds images, runs migrations, deploys to staging |
| **Deploy Production** | Manual trigger | Deploys a staging-tested image tag to production |

### Deployment Flow

1. Push to `main` triggers staging deployment automatically
2. Images are built and pushed to GHCR with tag `staging-<commit-sha>`
3. Database migrations run via Azure Container Apps job
4. Backend and frontend containers are updated on Azure Container Apps
5. After verifying staging, manually trigger production deployment with the tested image tag

## API Overview

### Authentication
- `POST /api/v1/login/access-token` - Login
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/password-recovery/{email}` - Password recovery

### Users
- `GET /api/v1/users/me` - Get current user
- `PATCH /api/v1/users/me` - Update current user
- `GET /api/v1/users/me/export` - Export user data (GDPR)
- `DELETE /api/v1/users/me` - Delete account

### Journeys
- `POST /api/v1/journeys/` - Create new journey
- `GET /api/v1/journeys/` - List user journeys
- `GET /api/v1/journeys/{id}` - Get journey details
- `DELETE /api/v1/journeys/{id}` - Delete a journey (soft delete)
- `GET /api/v1/journeys/{id}/progress` - Get journey progress
- `GET /api/v1/journeys/{id}/next-step` - Get next recommended step
- `PATCH /api/v1/journeys/{id}/steps/{step_id}` - Update step status
- `PATCH /api/v1/journeys/{id}/steps/{step_id}/tasks/{task_id}` - Toggle task completion

### Legal Knowledge Base
- `GET /api/v1/laws/` - List laws with filtering
- `GET /api/v1/laws/search?q={query}` - Search laws
- `GET /api/v1/laws/{id}` - Get law details
- `GET /api/v1/laws/categories` - List law categories
- `POST /api/v1/laws/{id}/bookmark` - Bookmark a law
- `GET /api/v1/laws/bookmarks` - Get user bookmarks

### Calculators
- `POST /api/v1/calculators/hidden-costs` - Calculate hidden costs
- `POST /api/v1/calculators/roi` - Calculate ROI
- `GET /api/v1/calculators/roi` - List saved ROI calculations
- `DELETE /api/v1/calculators/roi/{id}` - Delete saved ROI calculation
- `POST /api/v1/calculators/property-evaluations` - Evaluate property
- `GET /api/v1/calculators/property-evaluations` - List saved evaluations
- `GET /api/v1/calculators/property-evaluations/{share_id}` - Load shared evaluation
- `GET /api/v1/calculators/rent-estimate` - Estimate rent by postcode (Mietspiegel)

### Professionals
- `GET /api/v1/professionals/` - List professionals (with filters)
- `GET /api/v1/professionals/{id}` - Get professional details
- `POST /api/v1/professionals/{id}/contact` - Send contact inquiry
- `POST /api/v1/professionals/{id}/saved` - Save/unsave a professional
- `GET /api/v1/professionals/saved` - List saved professionals

### Portfolio
- `GET /api/v1/portfolio/properties` - List portfolio properties
- `POST /api/v1/portfolio/properties` - Add property to portfolio
- `GET /api/v1/portfolio/properties/{id}/income` - Rental income entries
- `POST /api/v1/portfolio/properties/{id}/income` - Log rental income
- `GET /api/v1/portfolio/properties/{id}/costs` - Running cost entries
- `POST /api/v1/portfolio/properties/{id}/costs` - Log running cost

### Contracts & Documents
- `POST /api/v1/contracts/analyze` - Analyse Kaufvertrag clauses
- `GET /api/v1/documents/` - List uploaded documents
- `POST /api/v1/documents/` - Upload document
- `DELETE /api/v1/documents/{id}` - Delete document

### Glossary
- `GET /api/v1/glossary/` - List glossary terms
- `GET /api/v1/glossary/search?q={query}` - Search glossary

### Dashboard
- `GET /api/v1/dashboard` - Dashboard overview
- `GET /api/v1/dashboard/activity` - Recent activity
- `GET /api/v1/dashboard/recommendations` - Personalised recommendations

### Subscriptions
- `GET /api/v1/subscriptions/current` - Get current subscription
- `POST /api/v1/subscriptions/checkout` - Create checkout session
- `POST /api/v1/subscriptions/portal` - Access billing portal

## Project Structure

```
heimpath/
├── .github/workflows/      # CI/CD pipelines
├── backend/
│   ├── app/
│   │   ├── api/             # API routes
│   │   ├── models/          # Database models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   ├── repository/      # Data access layer
│   │   └── core/            # Configuration
│   ├── tests/               # Test suite
│   └── alembic/             # Database migrations
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks (queries + mutations)
│   │   ├── models/          # TypeScript models
│   │   ├── routes/          # TanStack Router pages
│   │   ├── services/        # API service layer
│   │   └── query/           # Query key factory
│   └── tests/               # E2E tests (Playwright)
├── compose.yml              # Docker Compose (local + deployment)
└── compose.override.yml     # Local development overrides
```

## Development

### Running Tests

```bash
# Backend tests
docker compose exec backend pytest -v

# Frontend E2E tests
cd frontend && bunx playwright test
```

### Database Migrations

```bash
# Create a new migration
docker compose exec backend alembic revision --autogenerate -m "Description"

# Apply migrations
docker compose exec backend alembic upgrade head
```

### Generate Frontend API Client

```bash
# Automatic (requires backend venv active)
bash ./scripts/generate-client.sh

# Manual
cd frontend && bun run generate-client
```

### Code Quality

The project uses pre-commit hooks and CI checks:
- **Python**: Ruff (linting + formatting), type hints required
- **TypeScript**: Biome (linting + formatting), strict mode enabled
- **Commit messages**: Conventional commits enforced via commitlint

## License

This project is proprietary software. All rights reserved.

## Support

For support, please contact support@heimpath.com or open an issue in this repository.
