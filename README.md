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

### Core Features

- **Guided Property Journeys** - Personalized step-by-step guidance through the German property buying process
  - 4 phases: Research, Preparation, Buying, Closing
  - 15+ customizable steps based on user profile
  - Task tracking and progress monitoring
  - Personalization based on property type, financing, residency status
  - Journey deletion with confirmation

- **Legal Knowledge Base** - Comprehensive database of 50+ German real estate laws
  - Laws translated and explained in plain English
  - Full-text search across all law content
  - Court rulings and precedents
  - State-specific variations (e.g., land transfer tax rates)
  - Bookmark functionality for quick reference
  - Laws automatically surfaced at relevant journey steps

- **Financial Calculators**
  - Property Evaluation calculator with investment analysis
  - Hidden costs calculator
  - ROI calculator
  - Financing eligibility checker

- **Document Translation** - AI-powered translation of German legal documents
  - Risk warnings for legal/financial terms
  - Confidence scores for translations

- **Dashboard** - Overview of active journeys, recent activity, and recommendations

- **Notification System** - In-app notifications with read/unread tracking and preferences

### Technical Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Email verification
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
- **Traefik** - Reverse proxy with automatic HTTPS
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
| `DOMAIN` | Domain for Traefik routing (default: `localhost`) |
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
- `POST /api/v1/calculators/property-evaluations` - Evaluate property

### Dashboard
- `GET /api/v1/dashboard` - Dashboard overview
- `GET /api/v1/dashboard/activity` - Recent activity
- `GET /api/v1/dashboard/recommendations` - Personalized recommendations

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
├── compose.override.yml     # Local development overrides
└── compose.traefik.yml      # Traefik reverse proxy config
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

For support, please contact support@heimpath.de or open an issue in this repository.
