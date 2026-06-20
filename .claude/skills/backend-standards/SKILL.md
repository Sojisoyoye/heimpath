---
name: backend-standards
description: Detailed backend coding standards for HeimPath — FastAPI project structure, API endpoint patterns, async programming, database/ORM conventions, error handling, external integrations, testing, and logging. Load this when writing or reviewing backend code.
---

# Backend Standards (FastAPI)

## Project Structure

```
backend/app/
├── main.py                 # FastAPI application entry point
├── api/
│   ├── main.py             # Router aggregation (all routers at /api/v1)
│   ├── deps.py             # Dependency injection (get_db, CurrentUser)
│   └── routes/             # Route handlers by feature
├── models/                 # SQLAlchemy ORM models
│   ├── __init__.py         # Re-exports all models
│   └── base.py             # Base, UUIDPrimaryKeyMixin, TimestampMixin
├── schemas/                # Pydantic request/response schemas
├── services/               # Business logic (module-level functions)
├── repository/             # Data access layer (CRUD)
├── core/
│   ├── config.py           # Pydantic Settings (reads ../.env)
│   ├── db.py               # Sync engine (Alembic, init_db)
│   ├── database.py         # Async engine (AsyncSessionLocal)
│   └── security.py         # JWT, password hashing, OAuth2
├── alembic/versions/       # Migration files
└── utils/                  # Helpers, exceptions, validators
```

## Code Organization

**Separation of Concerns:**

- **Schemas**: Pydantic models for request/response validation (API contracts)
- **Models**: SQLAlchemy ORM models (database tables)
- **Services**: Business logic, external integrations (module-level functions, not classes)
- **Repository**: Database queries and persistence (CRUD operations)
- **Endpoints**: HTTP request handling and response formatting (thin)

**Dependency Injection:**

```python
@router.get("/properties/{property_id}")
async def get_property(
    property_id: int,
    service: PropertyService = Depends(get_property_service),
    current_user: User = Depends(get_current_user)
):
    return await service.get_property(property_id, current_user)
```

## API Endpoint Standards

**URL Structure:**

- `/api/v1/` prefix for all endpoints
- Resource-oriented plural nouns: `/api/v1/properties/` not `/api/v1/getProperties/`
- Path params for resources: `/api/v1/properties/{property_id}`
- Query params for filtering: `GET /api/v1/properties?city=Berlin&min_price=100000`

**HTTP Methods:**

```
GET    /api/v1/resources/       # List all
GET    /api/v1/resources/{id}   # Get specific
POST   /api/v1/resources/       # Create new
PUT    /api/v1/resources/{id}   # Full update
PATCH  /api/v1/resources/{id}   # Partial update
DELETE /api/v1/resources/{id}   # Delete
```

**Status Codes:** 200 (GET/PUT/PATCH), 201 (POST), 204 (DELETE), 400/401/403/404/422/500

**Request/Response:**

```python
class PropertyCreateRequest(BaseModel):
    """Request schema with validation."""
    address: str
    price: float = Field(..., gt=0, description="Property price in EUR")
    rooms: int = Field(..., ge=1)

    class Config:
        json_schema_extra = {
            "example": {
                "address": "Kurfürstendamm 1, Berlin",
                "price": 500000.00,
                "rooms": 3
            }
        }

class PropertyResponse(BaseModel):
    """Response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    address: str
    price: float
    created_at: datetime
```

**Error Responses:**

```python
{
    "detail": "User not found",
    "error_code": "USER_NOT_FOUND",
    "status_code": 404,
    "timestamp": "2025-01-30T12:00:00Z"
}

class AppException(Exception):
    def __init__(self, detail: str, status_code: int, error_code: str):
        self.detail = detail
        self.status_code = status_code
        self.error_code = error_code
```

## Async Programming

- All endpoints: `async def`
- All DB queries: async ORM (SQLAlchemy async)
- All external API calls: async (aiohttp, httpx)
- Never use blocking `requests.get()` — use `httpx.AsyncClient`

## Database & ORM

**Model Pattern:**

```python
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

class MyModel(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "my_model"
    # UUID PK + created_at/updated_at inherited
    name = Column(String(255), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id", ondelete="CASCADE"), index=True)
```

**Service Pattern (module-level functions, matching existing services):**

```python
def save_calculation(session: Session, user_id: uuid.UUID, inputs: CreateSchema) -> Model:
    model = Model(user_id=user_id, share_id=secrets.token_urlsafe(8), **computed_fields)
    session.add(model)
    session.commit()
    session.refresh(model)
    return model

def get_by_share_id(session: Session, share_id: str) -> Model:
    statement = select(Model).where(Model.share_id == share_id)
    result = session.exec(statement).first()
    if not result:
        raise HTTPException(status_code=404, detail="Not found")
    return result
```

**Migrations:** Alembic — `alembic revision --autogenerate -m "description"`

## Validation & Error Handling

- Pydantic validators for schema validation
- Custom exception classes in `utils/exceptions.py`
- Specific exceptions, never bare `Exception`
- Exception handlers in middleware
- Fail fast with clear error messages

## External Integrations

- **Translation**: Azure Cognitive Services wrapped in `TranslationService` — cache results, include risk warnings for legal terms
- **Payments**: Stripe wrapped in `PaymentService` — never log sensitive data, implement idempotency
- **Storage**: AWS S3 via async boto3 (aioboto3) — environment config, encryption

## Testing

- Unit tests for services/utilities (TDD — write test first, don't adjust test to pass)
- Integration tests for repository and API endpoints
- pytest fixtures for setup/teardown
- Mock external services (translation, Stripe, AWS)

## Logging

- Python `logging` with JSON formatting
- Include request IDs for tracing
- Levels: DEBUG, INFO, WARNING, ERROR
- Never log passwords, API keys, payment info
