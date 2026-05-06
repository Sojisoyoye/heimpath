import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import {
  type Body_login_login_access_token as AccessToken,
  AuthService,
  LoginService,
  type RegisterRequest,
  type UserPublic,
  UsersService,
} from "@/client"
import { queryClient } from "@/query/client"
import { handleError } from "@/utils"
import useCustomToast from "./useCustomToast"

/**
 * Returns true when the JS-readable `logged_in` cookie is present.
 * This cookie is set by the server on login alongside the HttpOnly
 * `access_token` cookie.  It lets us check auth state synchronously
 * (e.g. in TanStack Router `beforeLoad`) without touching localStorage.
 */
const isLoggedIn = () => {
  return document.cookie.split(";").some((c) => c.trim() === "logged_in=1")
}

const useAuth = (redirectTo?: string) => {
  const navigate = useNavigate()
  const { showErrorToast } = useCustomToast()

  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
  })

  // Uses /auth/register which sets email_verified=False and sends a
  // verification email. onSuccess is omitted — SignUp renders a
  // "check your email" confirmation when isSuccess is true.
  const signUpMutation = useMutation({
    mutationFn: (data: RegisterRequest) =>
      AuthService.register({ requestBody: data }),
    onError: handleError.bind(showErrorToast),
  })

  const login = async (data: AccessToken) => {
    await LoginService.loginAccessToken({ formData: data })
    queryClient.clear()
    // Auth tokens are stored in HttpOnly cookies by the server.
    // No localStorage write needed.
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      if (redirectTo) {
        window.location.href = redirectTo
        return
      }
      navigate({ to: "/dashboard" })
    },
    onError: handleError.bind(showErrorToast),
  })

  const logout = async () => {
    try {
      // Ask the server to blacklist the refresh token (from cookie) and delete
      // auth cookies.  The server accepts an empty body and falls back to the
      // HttpOnly refresh_token cookie automatically.
      await AuthService.logout({ requestBody: {} })
    } catch {
      // Ignore errors — proceed with client-side cleanup regardless
    }
    queryClient.clear()
    localStorage.removeItem("heimpath-wizard-state")
    localStorage.removeItem("heimpath-wizard-step")
    localStorage.removeItem("heimpath-email-banner-dismissed-at")
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("property-evaluation-")) {
        localStorage.removeItem(key)
      }
    }
    navigate({ to: "/login" })
  }

  return {
    signUpMutation,
    loginMutation,
    logout,
    user,
  }
}

export { isLoggedIn }
export default useAuth
