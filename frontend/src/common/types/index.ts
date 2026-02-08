/**
 * Common type definitions
 */

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  count: number;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  detail: string;
  errorCode?: string;
  statusCode: number;
  timestamp?: string;
}

/**
 * Generic filter params
 */
export interface FilterParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Select option type for dropdowns
 */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * Form field error
 */
export interface FieldError {
  field: string;
  message: string;
}
