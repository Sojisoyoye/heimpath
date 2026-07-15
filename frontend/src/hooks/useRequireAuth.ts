/**
 * useRequireAuth
 * Shared guard for UI actions that require an authenticated session (e.g.
 * bookmarking, rating) but can render on public pages reachable by
 * anonymous visitors. Centralizes the "log in required" toast + redirect
 * so every gated action behaves consistently.
 */

import { useNavigate } from "@tanstack/react-router"
import { isLoggedIn } from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"

/**
 * Returns a `requireAuth` guard: call it with a user-facing message before
 * firing an authenticated-only action. If the visitor is logged in, it
 * returns `true` and the caller proceeds. If not, it shows a toast
 * prompting login, redirects to `/login`, and returns `false` so the
 * caller can bail out without firing the action.
 */
function useRequireAuth() {
  const { showErrorToast } = useCustomToast()
  const navigate = useNavigate()

  const requireAuth = (message: string): boolean => {
    if (isLoggedIn()) return true

    showErrorToast(message, "Log in required")
    navigate({ to: "/login" })
    return false
  }

  return { requireAuth }
}

export default useRequireAuth
