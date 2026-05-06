/**
 * Shared key transformation utilities for API response/request conversion.
 * snake_case (backend) <-> camelCase (frontend)
 */

/** Convert a snake_case string to camelCase. */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

/** Convert a camelCase string to snake_case. */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/** Recursively convert all object keys from snake_case to camelCase. */
export function transformKeys<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item)) as T
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        snakeToCamel(key),
        transformKeys(value),
      ]),
    ) as T
  }
  return obj as T
}

/** Recursively convert all object keys from camelCase to snake_case. */
export function transformKeysToSnake<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeysToSnake(item)) as T
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        camelToSnake(key),
        transformKeysToSnake(value),
      ]),
    ) as T
  }
  return obj as T
}
