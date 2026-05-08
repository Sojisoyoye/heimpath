import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/client"

/** Maximum delay between retry attempts (ms). */
const MAX_RETRY_DELAY_MS = 30_000

/**
 * Handle API errors globally
 */
const handleApiError = (error: Error) => {
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    // Stay on /login — the login component handles its own 403 (unverified email)
    if (globalThis.location.pathname === "/login") return
    queryClient.clear()
    localStorage.removeItem("access_token")
    window.location.href = "/login"
  }
}

/**
 * React Query client configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Never retry client errors (4xx) — they won't succeed on retry.
      retry: (failureCount, error) => {
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        )
          return false
        return failureCount < 2
      },
      retryDelay: (attemptIndex) =>
        Math.min(1000 * 2 ** attemptIndex, MAX_RETRY_DELAY_MS),
      refetchOnWindowFocus: true,
    },
  },
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})
