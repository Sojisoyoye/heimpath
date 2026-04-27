/**
 * API Client wrapper
 * Provides a consistent interface for API calls with auth state handling
 */

import { OpenAPI } from "@/client"

/**
 * Initialize the API client with the base URL.
 * Auth is handled via HttpOnly cookies — no token is stored in JS memory.
 * withCredentials is enabled so the browser sends cookies on every request.
 *
 * In development the Vite dev server proxies /api/... to the backend, so we
 * use an empty base (relative URLs) to keep cookies on the same origin
 * (localhost).  In production there is no Vite proxy, so the full backend URL
 * is used directly.
 */
export function initializeApiClient() {
  OpenAPI.BASE = import.meta.env.PROD ? import.meta.env.VITE_API_URL : ""
  OpenAPI.WITH_CREDENTIALS = true
}

/**
 * Check if user is authenticated using the JS-readable `logged_in` indicator
 * cookie set by the server on login.  This is intentionally synchronous so it
 * can be called from TanStack Router's `beforeLoad`.
 */
export function isAuthenticated(): boolean {
  return document.cookie.split(";").some((c) => c.trim() === "logged_in=1")
}
