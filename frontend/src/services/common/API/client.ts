/**
 * API Client wrapper
 * Provides a consistent interface for API calls with auth token handling
 */

import { OpenAPI } from "@/client"

/**
 * Initialize the API client with the base URL and token handler
 * Called once at app startup
 */
export function initializeApiClient() {
  OpenAPI.BASE = import.meta.env.VITE_API_URL
  OpenAPI.TOKEN = async () => {
    return localStorage.getItem("access_token") || ""
  }
}

/**
 * Get the current auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem("access_token")
}

/**
 * Set the auth token
 */
export function setAuthToken(token: string): void {
  localStorage.setItem("access_token", token)
}

/**
 * Clear the auth token (logout)
 */
export function clearAuthToken(): void {
  localStorage.removeItem("access_token")
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}
