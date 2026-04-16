/**
 * Unsubscribe Page
 * Public route — processes email unsubscribe tokens
 */

import { useMutation } from "@tanstack/react-query"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useEffect } from "react"
import { z } from "zod"

import { AuthLayout } from "@/components/Common/AuthLayout"
import { NotificationService } from "@/services/NotificationService"

/******************************************************************************
                              Constants
******************************************************************************/

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  step_completed: "Step Completed",
  document_translated: "Document Translated",
  calculation_saved: "Calculation Saved",
  law_bookmarked: "Law Bookmarked",
  journey_deadline: "Journey Deadline",
  payment_reminder: "Payment Reminder",
  subscription_expiring: "Subscription Expiring",
  system_announcement: "System Announcement",
  weekly_digest: "Weekly Digest",
} as const

const searchSchema = z.object({
  token: z.string().catch(""),
})

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    if (!search.token) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: "Unsubscribe - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

function UnsubscribePage() {
  const { token } = Route.useSearch()

  const mutation = useMutation({
    mutationFn: () => NotificationService.unsubscribe(token),
  })

  const { mutate } = mutation
  useEffect(() => {
    mutate()
  }, [mutate])

  const typeLabel = mutation.data?.notificationType
    ? (NOTIFICATION_TYPE_LABELS[mutation.data.notificationType] ??
      mutation.data.notificationType)
    : ""

  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-4 text-center">
        {mutation.isPending && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm text-muted-foreground">
              Processing your unsubscribe request...
            </p>
          </>
        )}

        {mutation.isSuccess && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Unsubscribed</h2>
              <p className="text-sm text-muted-foreground">
                You&apos;ve been unsubscribed from <strong>{typeLabel}</strong>{" "}
                email notifications.
              </p>
              <p className="text-sm text-muted-foreground">
                You can manage all your notification preferences in Settings.
              </p>
            </div>
            <div className="mt-2 flex gap-3">
              <RouterLink
                to="/settings"
                className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-6 text-sm font-medium text-white hover:bg-blue-700"
              >
                Go to Settings
              </RouterLink>
              <RouterLink
                to="/"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium hover:bg-accent"
              >
                Home
              </RouterLink>
            </div>
          </>
        )}

        {mutation.isError && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Unsubscribe failed</h2>
              <p className="text-sm text-muted-foreground">
                This unsubscribe link is invalid or has expired. You can manage
                your notification preferences from the Settings page.
              </p>
            </div>
            <RouterLink
              to="/"
              className="mt-2 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent"
            >
              Go home
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

export default UnsubscribePage
