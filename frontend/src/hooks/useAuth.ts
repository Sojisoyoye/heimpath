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

const isLoggedIn = () => {
  return localStorage.getItem("access_token") !== null
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
    const response = await LoginService.loginAccessToken({
      formData: data,
    })
    queryClient.clear()
    localStorage.setItem("access_token", response.access_token)
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

  const logout = () => {
    queryClient.clear()
    localStorage.removeItem("access_token")
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
