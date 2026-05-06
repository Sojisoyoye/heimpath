# HeimPath Development Guidelines for Gemini Code

## Project Overview

**HeimPath** is a German Real Estate Navigator app helping foreign investors and immigrants navigate property buying processes. The platform combines guided journeys, legal knowledge, document translation, and financial calculators.

**Tech Stack:**

- **Frontend:** React + Tailwind CSS
- **Backend:** Python FastAPI + PostgreSQL
- **Infrastructure:** AWS
- **Integrations:** DeepL (translation), Stripe (payments)

---

## Backend Standards (FastAPI)

### Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Configuration management
│   ├── dependencies.py         # Dependency injection
│   ├── models/                 # Pydantic models & DB models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── property.py
│   │   ├── document.py
│   │   └── journey.py
│   ├── schemas/                # Pydantic request/response schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── property.py
│   │   └── translation.py
│   ├── api/                    # API route handlers
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── endpoints/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── users.py
│   │   │   │   ├── properties.py
│   │   │   │   ├── documents.py
│   │   │   │   ├── journeys.py
│   │   │   │   └── translations.py
│   │   │   └── api.py          # API router aggregation
│   ├── services/               # Business logic layer
│   │   ├── __init__.py
│   │   ├── user_service.py
│   │   ├── property_service.py
│   │   ├── translation_service.py  # DeepL integration
│   │   ├── payment_service.py      # Stripe integration
│   │   └── journey_service.py
│   ├── repository/             # Data access layer
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── user_repository.py
│   │   ├── property_repository.py
│   │   └── document_repository.py
│   ├── utils/                  # Utilities & helpers
│   │   ├── __init__.py
│   │   ├── logger.py
│   │   ├── exceptions.py
│   │   ├── validators.py
│   │   └── decorators.py
│   ├── middleware/             # Custom middleware
│   │   ├── __init__.py
│   │   ├── error_handler.py
│   │   └── logging_middleware.py
│   └── database.py             # Database connection & ORM setup
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_users.py
│   ├── test_properties.py
│   └── test_integrations.py
├── migrations/                 # Alembic database migrations
├── requirements.txt
├── .env.example
└── README.md
```

### Code Organization Principles

**Separation of Concerns:**

- **Schemas**: Pydantic models for request/response validation (handle API contracts)
- **Models**: SQLAlchemy ORM models (represent database tables)
- **Services**: Business logic, external integrations (DeepL, Stripe, AWS)
- **Repository**: Database queries and persistence (CRUD operations)
- **Endpoints**: HTTP request handling and response formatting

**Dependency Injection:**

- Use FastAPI's `Depends()` for dependency injection
- Inject services and repositories into endpoints, not database sessions
- Keeps endpoints thin and testable

```python
# Example: Proper injection
@router.get("/properties/{property_id}")
async def get_property(
    property_id: int,
    service: PropertyService = Depends(get_property_service),
    current_user: User = Depends(get_current_user)
):
    return await service.get_property(property_id, current_user)
```

### Naming Conventions

**Files & Directories:**

- Use snake_case for file and folder names
- Keep names descriptive: `translation_service.py` not `trans.py`
- Plural for modules with multiple related items: `endpoints/`, `services/`, `models/`
- `__init__.py` in all packages for proper imports

**Classes:**

- PascalCase for all classes
- Service classes: `PropertyService`, `TranslationService`
- Model classes: `User`, `Property`, `Document`
- Schema classes: `UserCreateRequest`, `PropertyResponse`
- Exception classes: `PropertyNotFoundError`, `InvalidDocumentError`

**Functions & Variables:**

- snake_case for functions and variables
- Use descriptive names: `validate_german_address()` not `val_addr()`
- Private functions: prefix with `_`: `_parse_document_metadata()`
- Boolean functions: use `is_`, `has_`, `can_`: `is_valid_property()`, `has_required_documents()`

**Constants:**

- UPPER_SNAKE_CASE
- Place in `config.py` or module-level
- Example: `MAX_DOCUMENT_SIZE_MB`, `DEEPL_API_TIMEOUT_SECONDS`

### API Endpoint Standards

**Versioning:**

- Use `/api/v1/` prefix for all endpoints
- Maintain backward compatibility in new versions
- All new features go to latest version first

**URL Structure:**

- Resource-oriented, not action-oriented
- Use plural nouns: `/api/v1/properties/` not `/api/v1/getProperties/`
- Path parameters for resources: `/api/v1/properties/{property_id}`
- Query parameters for filtering: `GET /api/v1/properties?city=Berlin&min_price=100000`

**HTTP Methods:**

```python
# READ
GET /api/v1/properties/           # List all
GET /api/v1/properties/{id}       # Get specific

# CREATE
POST /api/v1/properties/          # Create new

# UPDATE
PUT /api/v1/properties/{id}       # Full update (all fields)
PATCH /api/v1/properties/{id}     # Partial update

# DELETE
DELETE /api/v1/properties/{id}    # Delete
```

**Request/Response Standards:**

```python
# Schema examples
class PropertyCreateRequest(BaseModel):
    """Request schema with validation"""
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
    """Response schema"""
    id: int
    address: str
    price: float
    created_at: datetime

    class Config:
        from_attributes = True
```

**Status Codes:**

- `200 OK`: Successful GET, PUT, PATCH
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: User lacks permission
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error (FastAPI default)
- `500 Internal Server Error`: Server error

**Error Responses:**

```python
# Consistent error format
{
    "detail": "User not found",
    "error_code": "USER_NOT_FOUND",
    "status_code": 404,
    "timestamp": "2025-01-30T12:00:00Z"
}

# Use custom exception classes
class AppException(Exception):
    def __init__(self, detail: str, status_code: int, error_code: str):
        self.detail = detail
        self.status_code = status_code
        self.error_code = error_code
```

### Async Programming

**Always use async/await:**

- All endpoints should be `async def`
- All database queries should use async ORM (SQLAlchemy async)
- All external API calls should be async (aiohttp, httpx)

```python
# Correct
@router.get("/properties/{property_id}")
async def get_property(property_id: int, session: AsyncSession = Depends(get_db)):
    property = await session.get(Property, property_id)
    return property

# Avoid: blocking operations
@router.get("/translate")
async def translate(text: str, service = Depends(get_translation_service)):
    # Use async calls, never use requests.get() or blocking operations
    result = await service.translate_async(text, target_language="en")
    return result
```

### Database & ORM

**SQLAlchemy Best Practices:**

- Use async SQLAlchemy for all database operations
- Define models in `models/` directory
- Use `declarative_base()` pattern
- Include timestamps: `created_at`, `updated_at`
- Use proper relationships with `relationship()` and `ForeignKey`

```python
# models/user.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    citizenship = Column(String(50), nullable=False)  # For personalized journeys
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Repository Pattern:**

- Create repository classes for all database access
- Keep queries in repository, not scattered in services
- Enables easier testing with mock repositories

**Migrations:**

- Use Alembic for all schema changes
- Create migration for every schema modification
- Never manually modify database
- Command: `alembic revision --autogenerate -m "Add citizenship column"`

### Validation & Error Handling

**Input Validation:**

- Use Pydantic validators for schema validation
- Custom validators for business logic
- Fail fast with clear error messages

**Exception Handling:**

- Create custom exception classes in `utils/exceptions.py`
- Use specific exceptions, never bare `Exception`
- Add exception handlers in middleware

### External Integrations

**DeepL Translation Service:**

- Wrap DeepL API in `TranslationService`
- Cache translation results for repeated requests
- Include confidence scores and risk warnings for legal/financial terms
- Handle rate limiting gracefully

**Stripe Payment Integration:**

- Wrap Stripe API in `PaymentService`
- Never log sensitive payment data
- Implement idempotency for payment retries
- Handle webhook validation

**AWS Integration:**

- Use async boto3 client (aioboto3)
- Store configuration in environment variables
- Implement proper error handling and retries
- Use S3 for document storage with encryption

### Testing

**Test Structure:**

- Unit tests for services and utilities
- Follow TDD, that is write test first before writing implementation code and don't adjust test to make implementation pass
- Integration tests for repository and API endpoints
- Use pytest fixtures for setup/teardown
- Mock external services (DeepL, Stripe, AWS)

### Logging

**Structured Logging:**

- Use Python `logging` module with JSON formatting
- Include request IDs for tracing
- Log at appropriate levels: DEBUG, INFO, WARNING, ERROR
- Never log sensitive data (passwords, API keys, payment info)

---

## Frontend Standards (React + TypeScript + Tailwind)

### Based on React-Ts-Best-Practices

Frontend follows [React-Ts-Best-Practices by seanpmaxwell](https://github.com/seanpmaxwell/React-Ts-Best-Practices).

### Project Structure

```
frontend/src/
├── assets/
├── common/
│   ├── constants/
│   ├── types/
│   ├── utils/
│   └── styles/
│       ├── Colors.ts           # Centralized color tokens
│       └── BoxStyles.ts
├── components/
│   ├── _ui-common/             # Reusable UI components
│   │   ├── components/
│   │   │   ├── lg/
│   │   │   ├── md/
│   │   │   └── sm/
│   │   ├── hooks/
│   │   └── styles/
│   ├── pages/                  # Page-level components
│   ├── services/               # API integration layer
│   │   ├── common/
│   │   │   ├── API/
│   │   │   │   └── client.ts
│   │   │   └── Paths.ts
│   │   └── [Service].ts
│   ├── App.provider.tsx        # Context provider
│   ├── App.tsx
│   └── index.tsx
├── domain/                     # Client-side business logic
├── hooks/
│   ├── useAuth.ts
│   ├── queries/                # React Query hooks
│   └── mutations/
├── models/                     # Database entity types
├── query/                      # React Query configuration
│   ├── client.ts
│   └── queryKeys.ts
└── [config files]
```

### Functional Components

**Declaring Components:**

- Use **PascalCase** names and **function declarations** (not arrow functions)
- Define parents first, then children in same file
- Always type props with interface (e.g., `IProps`)
- **Do NOT** specify return type (always JSX.Element)

**Organizing Code - Template:**

```typescript
// PropertyCard.tsx
interface IProps {
  property: Property;
  onSelect: (property: Property) => void;
  isLoading?: boolean;
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY_FORMATTER = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

/******************************************************************************
                             Components
******************************************************************************/

/** Display property details. */
function PropertyCardHeader(props: { property: Property }) {
  const { property } = props;
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold">{property.address}</h3>
      <p className="text-gray-600 text-sm">{property.city}</p>
    </div>
  );
}

/** Default component. Display a property card. */
function PropertyCard(props: IProps) {
  const { property, onSelect, isLoading = false } = props;

  const handleSelect = () => onSelect(property);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg">
      <PropertyCardHeader property={property} />
      <div className="flex justify-between items-center">
        <span className="text-2xl font-bold text-blue-600">
          {CURRENCY_FORMATTER.format(property.price)}
        </span>
        <button
          onClick={handleSelect}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          {isLoading ? 'Loading...' : 'View Details'}
        </button>
      </div>
    </div>
  );
}

/******************************************************************************
                              Export
******************************************************************************/

export default PropertyCard;
```

**Key Principles:**

- Constants outside component (no reinitialization)
- Extract long helpers to Functions region
- Use whitespace/comments to separate logic
- Default export at bottom with "Default component..." comment
- Extract child components for related DOM blocks

### Component Standards

- PascalCase file names: `PropertyCard.tsx`
- One component per file
- Multi-file components: folder with `index.tsx`
- Co-locate Tailwind styles with components
- Keep components under 200 lines

### State Management: CRITICAL - Separate Server State from UI State

#### Server State: React Query (TanStack Query)

**Setup:**

```typescript
// query/client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
```

**Query Keys:**

```typescript
// query/queryKeys.ts
export const queryKeys = {
  properties: {
    all: ["properties"] as const,
    list: (filters?: PropertyFilter) =>
      [...queryKeys.properties.all, "list", filters] as const,
    detail: (id: number) =>
      [...queryKeys.properties.all, "detail", id] as const,
  },
  journeys: {
    all: ["journeys"] as const,
    list: () => [...queryKeys.journeys.all, "list"] as const,
    detail: (id: number) => [...queryKeys.journeys.all, "detail", id] as const,
  },
  users: {
    all: ["users"] as const,
    current: () => [...queryKeys.users.all, "current"] as const,
  },
};
```

**Query Hooks:**

```typescript
// hooks/queries/usePropertyQueries.ts
import { useQuery } from '@tanstack/react-query';
import { PropertyService } from '../../components/services/PropertyService';
import { queryKeys } from '../../query/queryKeys';

export const useProperties = (filters?: PropertyFilter) => {
  return useQuery({
    queryKey: queryKeys.properties.list(filters),
    queryFn: () => PropertyService.searchProperties(filters),
    enabled: !!filters,
  });
};

export const useProperty = (propertyId: number) => {
  return useQuery({
    queryKey: queryKeys.properties.detail(propertyId),
    queryFn: () => PropertyService.getProperty(propertyId),
    enabled: !!propertyId,
  });
};

// Usage in component
function PropertyList() {
  const { data, isLoading, error } = useProperties({ city: 'Berlin' });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.map(property => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
```

**Mutation Hooks:**

```typescript
// hooks/mutations/usePropertyMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PropertyService } from "../../components/services/PropertyService";
import { queryKeys } from "../../query/queryKeys";

export const useUpdateProperty = (propertyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<Property>) =>
      PropertyService.updateProperty(propertyId, updates),
    onMutate: async (updates) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.properties.detail(propertyId),
      });

      // Optimistic update
      const previousProperty = queryClient.getQueryData(
        queryKeys.properties.detail(propertyId),
      );
      queryClient.setQueryData(
        queryKeys.properties.detail(propertyId),
        (old: Property) => ({ ...old, ...updates }),
      );

      return { previousProperty };
    },
    onError: (err, updates, context) => {
      // Rollback on error
      if (context?.previousProperty) {
        queryClient.setQueryData(
          queryKeys.properties.detail(propertyId),
          context.previousProperty,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.properties.list(),
      });
    },
  });
};
```

**Wrap App:**

```typescript
// App.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query/client';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <Router>{/* Routes */}</Router>
      </AppProvider>
    </QueryClientProvider>
  );
}
```

#### UI State: React Hooks

**For local UI state, use `useState` or `useSetState`:**

```typescript
// hooks/useSetState.ts
import { useState, useCallback } from 'react';

export const useSetState = <T extends Record<string, unknown>>(initialState: T) => {
  const [state, setState] = useState<T>(initialState);

  const setPartialState = useCallback((update: Partial<T>) => {
    setState(prev => ({ ...prev, ...update }));
  }, []);

  const resetState = useCallback(() => {
    setState(initialState);
  }, [initialState]);

  return [state, setPartialState, resetState] as const;
};

// Usage
function DocumentUploadForm() {
  const [state, setState, resetState] = useSetState({
    fileName: '',
    uploadProgress: 0,
    isUploading: false,
  });

  return (
    <div>
      <input
        onChange={(e) => setState({ fileName: e.target.value })}
        value={state.fileName}
      />
      {state.isUploading && <progress value={state.uploadProgress} />}
      <button onClick={resetState}>Reset</button>
    </div>
  );
}
```

**Rules:**

- `useState` for 1-2 pieces of state
- Switch to `useSetState` as state grows
- Keeps state prefixed with `state`, improving readability

#### Global State: Context API

**For app-wide state (auth, preferences):**

```typescript
// components/App.provider.tsx
import { createContext, useContext, useCallback, useState } from 'react';
import { User } from '../types/user';

interface IAppContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const AppContext = createContext<IAppContextValue | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_token');
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AppContext.Provider>
  );
}
```

**Key Rules:**

- Split provider into separate `.provider.tsx` file
- Use multiple providers scoped low (avoid unnecessary rerenders)
- Props are enough for one-level data passing
- Switch to Context for multi-file or deeply nested trees

### Styling with Tailwind

**Principles:**

- Use Tailwind utilities exclusively; avoid custom CSS
- Keep color tokens in `src/common/styles/Colors.ts`, never hardcode hex
- Group base colors, expose through semantic buckets
- Mobile-first responsive: `sm:`, `md:`, `lg:` prefixes

**Color Token Pattern:**

```typescript
// src/common/styles/Colors.ts
const Base = {
  Grey: {
    UltraLight: "#f2f2f2",
    Lighter: "#e5e5e5",
    Default: "#808080",
    Dark: "#a9a9a9",
    UltraDark: "#0c0c0c",
  },
  Blue: {
    Default: "#0066cc",
    Light: "#4d94ff",
    Dark: "#004d99",
  },
};

export default {
  Background: {
    Default: Base.Grey.Default,
    Hover: Base.Grey.Lighter,
    Error: "#ff0000",
  },
  Text: {
    Primary: Base.Grey.UltraDark,
    Error: "#ff0000",
  },
};
```

**Using Tokens:**

```typescript
import Colors from '@src/common/styles/Colors';

function StatusBadge({ status }: { status: 'success' | 'error' }) {
  const bgColor = status === 'success'
    ? Colors.Background.Default
    : Colors.Background.Error;

  return (
    <div style={{ backgroundColor: bgColor }} className="px-3 py-1 rounded-full">
      {status}
    </div>
  );
}
```

**Common Patterns:**

```jsx
// Button
className="px-4 py-2 rounded-md font-medium transition-colors
  bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"

// Responsive grid (mobile-first)
className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"

// Form input
className="w-full px-3 py-2 border border-gray-300 rounded-md
  focus:outline-none focus:ring-2 focus:ring-blue-500"

// Card
className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
```

### Callback Parameter Naming

**Simple inline callbacks use short placeholders; complex use descriptive names:**

```typescript
function Parent() {
  const [state, setState] = useSetState({
    name: '',
    nameError: false,
    email: '',
    emailError: false,
  });

  return (
    <div>
      {/* Short placeholders */}
      <CustomInput
        value={state.name}
        onChange={(v, err) => setState({ name: v, nameError: err })}
      />
      <CustomInput
        value={state.email}
        onChange={(v, err) => setState({ email: v, emailError: err })}
      />

      {/* Descriptive for complex logic */}
      <button
        disabled={state.nameError || state.emailError}
        onClick={() => handleSubmit()}
      >
        Submit
      </button>
    </div>
  );
}

function CustomInput(props: {
  value: string;
  onChange: (value: string, error?: boolean) => void;
}) {
  const { value, onChange } = props;
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value.trim(), !e.target.value)}
    />
  );
}
```

**Rules:**

- `v` = `value` in simple one-liners
- `err` = `error` in simple one-liners
- Use full names for complex logic or multiple lines
- Keeps JSX clean while being self-documenting

### TypeScript Standards

**Strict Mode:**

- All files: `.tsx` or `.ts`
- Never use `any`
- Define interfaces for all props and API responses
- Proper typing for all API calls

**Interface Naming:**

- Props interfaces: `IProps`, `IPropertyCardProps`
- Never use `React.FC`

```typescript
// Correct
interface IPropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
}

function PropertyCard(props: IPropertyCardProps) {
  // ...
}

// API response types
interface PropertyListResponse {
  data: Property[];
  total: number;
  page: number;
}

// Use strict types
const [items, setItems] = useState<Property[]>([]); // Good
const [items, setItems] = useState<any>([]); // Bad
```

### API Integration

**Client Service:**

```typescript
// services/common/API/client.ts
import axios, { AxiosInstance } from "axios";

class APIClient {
  private client: AxiosInstance;

  constructor(baseURL: string = import.meta.env.VITE_API_URL) {
    this.client = axios.create({
      baseURL,
      headers: { "Content-Type": "application/json" },
    });

    // Auth interceptor
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // 401 interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("auth_token");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T>(url: string, config = {}) {
    return this.client.get<T>(url, config);
  }

  async post<T>(url: string, data: unknown, config = {}) {
    return this.client.post<T>(url, data, config);
  }
}

export const apiClient = new APIClient();
```

**Service Example:**

```typescript
// services/PropertyService.ts
import { apiClient } from "./common/API/client";
import { PATHS } from "./common/Paths";
import {
  Property,
  PropertyListResponse,
  PropertyFilter,
} from "../types/property";

class PropertyService {
  async searchProperties(
    filters: PropertyFilter,
  ): Promise<PropertyListResponse> {
    const response = await apiClient.get<PropertyListResponse>(
      PATHS.PROPERTIES.LIST,
      { params: filters },
    );
    return response.data;
  }

  async getProperty(id: number): Promise<Property> {
    const response = await apiClient.get<Property>(PATHS.PROPERTIES.DETAIL(id));
    return response.data;
  }

  async updateProperty(
    id: number,
    updates: Partial<Property>,
  ): Promise<Property> {
    const response = await apiClient.post<Property>(
      PATHS.PROPERTIES.DETAIL(id),
      updates,
    );
    return response.data;
  }
}

export const PropertyService = new PropertyService();
```

**Centralize Paths:**

```typescript
// services/common/Paths.ts
export const PATHS = {
  PROPERTIES: {
    LIST: "/api/v1/properties",
    DETAIL: (id: number) => `/api/v1/properties/${id}`,
  },
  USERS: {
    CURRENT: "/api/v1/users/me",
    DETAIL: (id: number) => `/api/v1/users/${id}`,
  },
  JOURNEYS: {
    LIST: "/api/v1/journeys",
    DETAIL: (id: number) => `/api/v1/journeys/${id}`,
  },
};
```

### Quote Convention

**API Client Service:**

```typescript
// services/apiClient.ts
import axios, { AxiosInstance } from "axios";

class APIClient {
  private client: AxiosInstance;

  constructor(baseURL: string = import.meta.env.VITE_API_URL) {
    this.client = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 responses
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear auth and redirect to login
          localStorage.removeItem("auth_token");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T>(url: string, config = {}) {
    return this.client.get<T>(url, config);
  }

  async post<T>(url: string, data: unknown, config = {}) {
    return this.client.post<T>(url, data, config);
  }
}

export const apiClient = new APIClient();
```

**Service Example:**

```typescript
// services/propertyService.ts
import { apiClient } from "./apiClient";
import {
  Property,
  PropertyListResponse,
  PropertyFilter,
} from "../types/property";

class PropertyService {
  async searchProperties(
    filters: PropertyFilter,
  ): Promise<PropertyListResponse> {
    const response = await apiClient.get<PropertyListResponse>(
      "/api/v1/properties",
      { params: filters },
    );
    return response.data;
  }

  async getProperty(id: number): Promise<Property> {
    const response = await apiClient.get<Property>(`/api/v1/properties/${id}`);
    return response.data;
  }

  async createProperty(
    property: Omit<Property, "id" | "createdAt" | "updatedAt">,
  ): Promise<Property> {
    const response = await apiClient.post<Property>(
      "/api/v1/properties",
      property,
    );
    return response.data;
  }
}

export const propertyService = new PropertyService();
```

---

## Key Development Patterns

### Guided Journey Feature

**Implementation approach:**

- Store journey phases (Research, Preparation, Buying, Closing) as immutable steps
- Personalize visible steps based on user citizenship and property situation
- Track completion state per user and property
- Provide next-step recommendations

```typescript
// Backend example
@router.get("/api/v1/journeys/{journey_id}/next-step")
async def get_next_step(
    journey_id: int,
    service: JourneyService = Depends(get_journey_service),
    current_user: User = Depends(get_current_user)
):
    next_step = await service.get_next_recommended_step(journey_id, current_user)
    return next_step
```

### Document Translation with Risk Warnings

**Pattern:**

- Upload German document
- Extract and translate text using DeepL
- Flag financial/legal terms requiring manual review
- Return translation with confidence scores and warnings

```typescript
// Frontend: Upload and translate
const handleDocumentUpload = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", currentUser.id);

  const result = await translationService.translateDocument(formData);

  if (result.requiresReview) {
    showWarning(
      "This translation contains legal terms requiring manual review",
    );
  }

  displayTranslation(result);
};
```

### Financial Calculators

**Pattern:**

- Accept property price and various cost factors
- Calculate total cost of ownership including taxes, notary, agent fees
- Break down costs by category
- Provide comparison with market averages

---

## General Development Rules

### Code Quality

**DO:**

- Write self-documenting code with clear names
- Add comments only for "why", not "what"
- Keep functions/methods small and single-purpose
- Use type hints everywhere (Python and TypeScript)
- Write tests for business logic
- Review error messages - they should be user-friendly
- Use descriptive commit messages

**DON'T:**

- Don't commit commented-out code
- Don't use magic numbers - extract to constants
- Don't create functions longer than 50 lines
- Don't skip error handling
- Don't hardcode configuration values
- Don't log sensitive information

### Git Workflow

**Branch naming:**

- `feature/guided-journey-personalization`
- `bugfix/deepl-rate-limiting`
- `refactor/optimize-database-queries`
- `docs/add-api-documentation`

**Commit messages:**

- Imperative: "Add user authentication" not "Added user authentication"
- Keep subject to 50 characters
- Include issue number if applicable: "Fix property search filtering (#123)"

### Environment Configuration

**Never commit:**

- `.env` files with secrets
- API keys or passwords
- Database credentials

**Create `.env.example` with placeholders:**

```env
# Backend
DATABASE_URL=postgresql+asyncpg://user:password@localhost/heimpath
DEEPL_API_KEY=your_deepl_key_here
STRIPE_SECRET_KEY=your_stripe_key_here
AWS_ACCESS_KEY_ID=your_aws_key_here
JWT_SECRET_KEY=your_secret_key_here

# Frontend
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=HeimPath
```

### Documentation

**Docstrings Required For:**

- All public functions and classes
- Complex algorithms
- Integration points with external services

```python
# Example docstring
async def translate_document(self, text: str, target_lang: str = "EN") -> TranslationResult:
    """
    Translate a German document to target language using DeepL.

    Args:
        text (str): German text to translate
        target_lang (str, optional): Target language code. Defaults to "EN".

    Returns:
        TranslationResult: Translation with confidence score and risk warnings

    Raises:
        TranslationServiceError: If DeepL API call fails
        InvalidInputError: If text is empty or too long

    Example:
        >>> result = await translate_document("Kaufvertrag")
        >>> print(result.translated)
        'Purchase Agreement'
    """
```

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
- [ ] Code review checklist passed
- [ ] Lighthouse/performance checks passed

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
