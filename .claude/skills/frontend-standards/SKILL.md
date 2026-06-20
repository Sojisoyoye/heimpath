---
name: frontend-standards
description: Detailed frontend coding standards for HeimPath — React component patterns, state management (TanStack Query + hooks), Tailwind styling, API integration, TypeScript conventions, and code organization templates. Load this when writing or reviewing frontend code.
---

# Frontend Standards (React + TypeScript + Tailwind)

Based on [React-Ts-Best-Practices by seanpmaxwell](https://github.com/seanpmaxwell/React-Ts-Best-Practices).

## Component Pattern

Use **PascalCase** function declarations (not arrow functions). Type props with `IProps`. Do NOT specify return type.

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
        <button onClick={handleSelect} disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md">
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
- Use section comments to separate logic
- Default export at bottom with "Default component..." JSDoc
- Extract child components for related DOM blocks
- PascalCase file names: `PropertyCard.tsx`
- One component per file, keep under 200 lines
- Multi-file components: folder with `index.tsx`

## State Management — Separate Server State from UI State

### Server State: TanStack Query

**QueryClient Setup (`query/client.ts`):**

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000, retry: 1, refetchOnWindowFocus: true },
  },
});
```

**Query Keys (`query/queryKeys.ts`) — factory pattern:**

```typescript
export const queryKeys = {
  properties: {
    all: ["properties"] as const,
    list: (filters?: PropertyFilter) => [...queryKeys.properties.all, "list", filters] as const,
    detail: (id: number) => [...queryKeys.properties.all, "detail", id] as const,
  },
};
```

**Query Hooks (`hooks/queries/`):**

```typescript
export function useProperty(propertyId: number) {
  return useQuery({
    queryKey: queryKeys.properties.detail(propertyId),
    queryFn: () => PropertyService.getProperty(propertyId),
    enabled: !!propertyId,
  });
}
```

**Mutation Hooks (`hooks/mutations/`):**

```typescript
export function useUpdateProperty(propertyId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<Property>) =>
      PropertyService.updateProperty(propertyId, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.properties.detail(propertyId) });
      const previous = queryClient.getQueryData(queryKeys.properties.detail(propertyId));
      queryClient.setQueryData(
        queryKeys.properties.detail(propertyId),
        (old: Property) => ({ ...old, ...updates }),
      );
      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.properties.detail(propertyId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.list() });
    },
  });
}
```

### UI State: React Hooks

- `useState` for 1-2 pieces of state
- `useSetState` when state grows (keeps state prefixed with `state`)

```typescript
const [state, setState, resetState] = useSetState({
  fileName: '', uploadProgress: 0, isUploading: false,
});
```

### Global State: Context API

- Split provider into `.provider.tsx` file
- Scope providers low (avoid unnecessary rerenders)
- Props for one-level passing; Context for multi-file / deep trees

## Styling with Tailwind

- Tailwind utilities exclusively; avoid custom CSS
- Color tokens in `src/common/styles/Colors.ts`, never hardcode hex
- Mobile-first responsive: `sm:`, `md:`, `lg:` prefixes

**Color Token Pattern:**

```typescript
const Base = { Grey: { UltraLight: "#f2f2f2", Default: "#808080", UltraDark: "#0c0c0c" } };
export default {
  Background: { Default: Base.Grey.Default, Error: "#ff0000" },
  Text: { Primary: Base.Grey.UltraDark, Error: "#ff0000" },
};
```

**Common Tailwind Patterns:**

```jsx
// Button
"px-4 py-2 rounded-md font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
// Responsive grid
"grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
// Form input
"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
// Card
"bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
```

## API Integration

**Service Pattern (singleton class using OpenAPI `request()`):**

```typescript
import { OpenAPI } from "@/client";
import { request } from "@/client/core/request";
import { PATHS } from "./common/Paths";

class PropertyServiceClass {
  async getProperty(id: string): Promise<Property> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.PROPERTIES.DETAIL(id),
    });
    return transformKeys<Property>(response); // snake_case -> camelCase
  }
}
export const PropertyService = new PropertyServiceClass();
```

**Key helpers in services:** `transformKeys<T>()` (snake->camel) and `transformKeysToSnake()` (camel->snake)

**Centralized Paths (`services/common/Paths.ts`):**

```typescript
const API_V1 = "/api/v1";
export const PATHS = {
  PROPERTIES: {
    LIST: `${API_V1}/properties`,
    DETAIL: (id: string) => `${API_V1}/properties/${id}`,
  },
};
```

## TypeScript Standards

- Strict mode, all files `.tsx` or `.ts`
- Never use `any`
- Props interfaces: `IProps` or `I[Name]Props`
- Never use `React.FC`
- Define interfaces for all API responses

## Callback Parameter Naming

- Short placeholders in simple inline callbacks: `v` = value, `err` = error
- Full descriptive names for complex logic or multi-line callbacks

```typescript
{/* Short */}
<CustomInput value={state.name} onChange={(v, err) => setState({ name: v, nameError: err })} />

{/* Descriptive for complex logic */}
<button onClick={() => handleSubmit()}>Submit</button>
```

## Toast Notifications

```typescript
import useCustomToast from "@/hooks/useCustomToast";

const { showSuccessToast, showErrorToast } = useCustomToast();
showSuccessToast("Item saved");
showErrorToast("Failed to save");
```
