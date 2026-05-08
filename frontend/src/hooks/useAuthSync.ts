import { useEffect } from "react"

import { queryClient } from "@/query/client"

const AUTH_CHANNEL_NAME = "heimpath-auth"

/**
 * How often to silently re-validate the session against the server.
 * A 401 from /users/me is caught by queryCache.onError in client.ts,
 * which clears the cache and redirects to /login.
 */
const SESSION_POLL_INTERVAL_MS = 5 * 60 * 1000

/**
 * Broadcast a logout event to all other tabs that have HeimPath open.
 * Called from logout() so other tabs log out simultaneously without
 * waiting for their next API call to fail with 401.
 */
export function broadcastLogout(): void {
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    channel.postMessage({ type: "logout" })
    channel.close()
  } catch {
    // BroadcastChannel is unavailable in some environments (e.g. certain
    // browser extensions or sandboxed contexts). Logout still works locally.
  }
}

/**
 * Installs cross-tab auth synchronisation for the lifetime of the layout.
 *
 * Two mechanisms keep auth state in sync:
 *
 * 1. BroadcastChannel — when the user explicitly logs out in one tab, a
 *    "logout" message is broadcast so other tabs redirect to /login
 *    immediately without waiting for an API call to fail.
 *
 * 2. Periodic session poll — every 5 minutes the currentUser query is
 *    forcibly refetched against the server. If the session has been
 *    invalidated server-side (token rotation, forced logout, account
 *    suspension), the resulting 401 is caught by queryCache.onError
 *    in query/client.ts, which clears the cache and redirects to /login.
 *
 * Note: the `logged_in` cookie read by isLoggedIn() is a plain (non-HttpOnly)
 * boolean indicator. The actual access token remains HttpOnly and is never
 * accessible from JavaScript. This means isLoggedIn() can go stale — these
 * two mechanisms ensure the JS auth state eventually converges with the
 * server's view.
 */
export function useAuthSync(): void {
  useEffect(() => {
    // 1. Cross-tab logout via BroadcastChannel
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL_NAME)
      channel.addEventListener("message", (event: MessageEvent) => {
        if (event.data?.type === "logout") {
          queryClient.clear()
          window.location.href = "/login"
        }
      })
    } catch {
      // BroadcastChannel unavailable — cross-tab sync disabled gracefully
    }

    // 2. Periodic session validation
    const timerId = window.setInterval(() => {
      void queryClient.refetchQueries({ queryKey: ["currentUser"] })
    }, SESSION_POLL_INTERVAL_MS)

    return () => {
      channel?.close()
      window.clearInterval(timerId)
    }
  }, [])
}
