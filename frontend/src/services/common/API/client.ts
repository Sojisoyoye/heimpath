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
  // Always use relative URLs so requests go to the same origin as the frontend.
  // In production, nginx proxies /api/ to the backend (see nginx.conf.template).
  // In local dev, Vite proxies /api/ to the backend (see vite.config.ts).
  // This ensures cookies set by the backend are on the frontend domain and
  // readable by document.cookie for isLoggedIn() checks.
  OpenAPI.BASE = ""
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
