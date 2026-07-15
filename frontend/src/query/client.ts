import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ApiError, AuthService } from "@/client"
import { isLoggedIn } from "@/hooks/useAuth"

/** Maximum delay between retry attempts (ms). */
const MAX_RETRY_DELAY_MS = 30_000

/**
 * Mutex for token refresh — ensures at most one /auth/refresh call is in
 * flight at a time, regardless of how many parallel requests all 401 at once.
 */
let refreshPromise: Promise<void> | null = null

/**
 * Attempt a silent token refresh. Parallel callers share the same promise so
 * exactly one POST /auth/refresh is made per "wave" of 401 responses.
 */
async function attemptRefresh(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = AuthService.refreshToken({ requestBody: {} })
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/** Clear client state and navigate to /login. */
function forceLogout(): void {
  queryClient.clear()
  localStorage.removeItem("access_token")
  window.location.href = "/login"
}

/**
 * Whether the global session-recovery flow (silent refresh / force logout)
 * should run for this error. Skips non-API errors, requests already on the
 * login page, and — importantly — anonymous visitors: a 401 for a visitor
 * with no session (e.g. hitting a freemium page's gated action) is expected
 * and should not force-navigate an anonymous browser to /login.
 */
function shouldHandleAuthError(error: Error): error is ApiError {
  if (!(error instanceof ApiError)) return false
  if (globalThis.location.pathname === "/login") return false
  return isLoggedIn()
}

/**
 * Query error handler.
 *
 * On 401: attempt a silent refresh then invalidate all queries so they
 * automatically re-fire. On 403 or refresh failure, force logout.
 */
const handleQueryError = (error: Error) => {
  if (!shouldHandleAuthError(error)) return

  if (error.status === 403) {
    forceLogout()
    return
  }

  if (error.status === 401) {
    attemptRefresh()
      .then(() => {
        void queryClient.invalidateQueries()
      })
      .catch(() => forceLogout())
  }
}

/**
 * Mutation error handler.
 *
 * On 401: attempt a silent refresh then inform the user to retry — mutations
 * are not re-fired automatically because they may not be idempotent.
 * On 403 or refresh failure, force logout.
 */
const handleMutationError = (error: Error) => {
  if (!shouldHandleAuthError(error)) return

  if (error.status === 403) {
    forceLogout()
    return
  }

  if (error.status === 401) {
    attemptRefresh()
      .then(() =>
        toast.info("Session refreshed — please try again.", {
          duration: 5000,
        }),
      )
      .catch(() => forceLogout())
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
    onError: handleQueryError,
  }),
  mutationCache: new MutationCache({
    onError: handleMutationError,
  }),
})
