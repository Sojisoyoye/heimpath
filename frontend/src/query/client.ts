import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/client"

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
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
