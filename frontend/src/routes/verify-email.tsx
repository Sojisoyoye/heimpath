import { useMutation } from "@tanstack/react-query"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useEffect } from "react"
import { z } from "zod"

import { AuthService } from "@/client"
import { AuthLayout } from "@/components/Common/AuthLayout"
import { isLoggedIn } from "@/hooks/useAuth"

/******************************************************************************
                              Constants
******************************************************************************/

const searchSchema = z.object({
  token: z.string().catch(""),
})

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmail,
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    if (isLoggedIn()) {
      throw redirect({ to: "/dashboard" })
    }
    if (!search.token) {
      throw redirect({ to: "/login" })
    }
  },
  head: () => ({
    meta: [{ title: "Verify Email - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

function VerifyEmail() {
  const { token } = Route.useSearch()

  const mutation = useMutation({
    mutationFn: () => AuthService.verifyEmail({ requestBody: { token } }),
  })

  const { mutate } = mutation
  useEffect(() => {
    mutate()
  }, [mutate])

  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-4 text-center">
        {mutation.isPending && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm text-muted-foreground">
              Verifying your email…
            </p>
          </>
        )}

        {mutation.isSuccess && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Email verified!</h2>
              <p className="text-sm text-muted-foreground">
                Your account is now active. You can sign in.
              </p>
            </div>
            <RouterLink
              to="/login"
              className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-8 text-sm font-medium text-white hover:bg-blue-700"
            >
              Sign in
            </RouterLink>
          </>
        )}

        {mutation.isError && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Verification failed</h2>
              <p className="text-sm text-muted-foreground">
                This link is invalid or has expired. Request a new one from the
                sign-in page.
              </p>
            </div>
            <RouterLink
              to="/login"
              className="mt-2 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent"
            >
              Back to sign in
            </RouterLink>
          </>
        )}
      </div>
    </AuthLayout>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default VerifyEmail
