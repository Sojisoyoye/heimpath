# HeimPath - German Real Estate Navigator

HeimPath is a comprehensive platform helping foreign investors and immigrants navigate the German property buying process. The platform combines guided journeys, legal knowledge, document translation, and financial calculators to make property buying in Germany accessible and transparent.

## Features

### Core Features

- **Guided Property Journeys** - Personalized step-by-step guidance through the German property buying process
  - 4 phases: Research, Preparation, Buying, Closing
  - 15+ customizable steps based on user profile
  - Task tracking and progress monitoring
  - Personalization based on property type, financing, residency status

- **Legal Knowledge Base** - Comprehensive database of 50+ German real estate laws
  - Laws translated and explained in plain English
  - Full-text search across all law content
  - Court rulings and precedents
  - State-specific variations (e.g., land transfer tax rates)
  - Bookmark functionality for quick reference
  - Laws automatically surfaced at relevant journey steps

- **Document Translation** - AI-powered translation of German legal documents (Coming Soon)
  - Risk warnings for legal/financial terms
  - Confidence scores for translations

- **Financial Calculators** - Hidden costs calculator, ROI calculator, financing eligibility (Coming Soon)

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
- **Pytest** - Testing framework (271+ tests)

### Frontend
- **React** - Frontend library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool

### Infrastructure
- **Docker Compose** - Container orchestration
- **Traefik** - Reverse proxy with automatic HTTPS
- **GitHub Actions** - CI/CD pipelines

### Integrations
- **Stripe** - Payment processing
- **DeepL** - Document translation (planned)

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.10+ (for backend development)

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/your-org/heimpath.git
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
| `SECRET_KEY` | JWT secret key |
| `POSTGRES_PASSWORD` | Database password |
| `FIRST_SUPERUSER` | Admin email |
| `FIRST_SUPERUSER_PASSWORD` | Admin password |
| `STRIPE_SECRET_KEY` | Stripe API key (optional) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret (optional) |

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
- `GET /api/v1/journeys/{id}/progress` - Get journey progress
- `GET /api/v1/journeys/{id}/next-step` - Get next recommended step
- `PATCH /api/v1/journeys/{id}/steps/{step_id}` - Update step status

### Legal Knowledge Base
- `GET /api/v1/laws/` - List laws with filtering
- `GET /api/v1/laws/search?q={query}` - Search laws
- `GET /api/v1/laws/{id}` - Get law details
- `GET /api/v1/laws/categories` - List law categories
- `POST /api/v1/laws/{id}/bookmark` - Bookmark a law
- `GET /api/v1/laws/bookmarks` - Get user bookmarks

### Subscriptions
- `GET /api/v1/subscriptions/current` - Get current subscription
- `POST /api/v1/subscriptions/checkout` - Create checkout session
- `POST /api/v1/subscriptions/portal` - Access billing portal

## Project Structure

```
heimpath/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── models/        # Database models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   ├── repository/    # Data access layer
│   │   └── core/          # Configuration
│   ├── tests/             # Test suite
│   └── alembic/           # Database migrations
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API client
│   │   └── hooks/         # Custom hooks
│   └── tests/             # Frontend tests
└── docker-compose.yml
```

## Development

### Running Tests

```bash
# Backend tests
docker compose exec backend pytest -v

# Frontend tests
cd frontend && npm test
```

### Database Migrations

```bash
# Create a new migration
docker compose exec backend alembic revision --autogenerate -m "Description"

# Apply migrations
docker compose exec backend alembic upgrade head
```

### Code Quality

The project follows strict coding standards:
- Python: PEP 8, type hints required
- TypeScript: Strict mode enabled
- Tests required for all new features

## Roadmap

- [x] User authentication and authorization
- [x] Guided property journeys
- [x] Legal knowledge base with search
- [x] Stripe subscription integration
- [ ] Document translation with DeepL
- [ ] Hidden costs calculator
- [ ] ROI calculator
- [ ] Financing eligibility checker
- [ ] User dashboard
- [ ] Notification system

## License

This project is proprietary software. All rights reserved.

## Support

For support, please contact support@heimpath.de or open an issue in this repository.
