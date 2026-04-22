import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { MailWarning, X } from "lucide-react"
import { useState } from "react"

import { AuthService, type UserPublic, UsersService } from "@/client"
import { Footer } from "@/components/Common/Footer"
import { NavUserMenu } from "@/components/Common/NavUserMenu"
import { FeedbackDialog } from "@/components/Feedback/FeedbackDialog"
import NotificationBell from "@/components/Notifications/NotificationBell"
import { SearchTrigger } from "@/components/Search"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { isLoggedIn } from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

/******************************************************************************
                              Constants
******************************************************************************/

const DISMISS_KEY = "heimpath-email-banner-dismissed-at"
const RESHOW_DAYS = 7

/******************************************************************************
                              Helpers
******************************************************************************/

/** Check if the banner was dismissed less than RESHOW_DAYS ago. */
function isBannerDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  const elapsed = Date.now() - dismissedAt
  return elapsed < RESHOW_DAYS * 24 * 60 * 60 * 1000
}

/** Persist dismissal timestamp. */
function dismissBanner(): void {
  localStorage.setItem(DISMISS_KEY, String(Date.now()))
}

/******************************************************************************
                              Hooks
******************************************************************************/

/** Shared hook for unverified-email state and resend action. */
function useEmailVerification() {
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
  })

  const resendMutation = useMutation({
    mutationFn: () =>
      AuthService.resendVerification({
        requestBody: { email: user!.email },
      }),
    onSuccess: () =>
      showSuccessToast("Verification email sent — check your inbox."),
    onError: handleError.bind(showErrorToast),
  })

  const isUnverified = !!user && user.email_verified === false

  return { user, isUnverified, resendMutation }
}

/******************************************************************************
                              Components
******************************************************************************/

/** Subtle header icon shown after the banner has been dismissed. */
function UnverifiedEmailIndicator(
  props: Readonly<{
    onResend: () => void
    isPending: boolean
    isSuccess: boolean
  }>,
) {
  const { onResend, isPending, isSuccess } = props

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onResend}
          disabled={isPending || isSuccess}
          className="relative rounded-md p-2 text-amber-600 hover:bg-amber-50 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-900/30"
          aria-label="Email not verified — click to resend"
        >
          <MailWarning className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {isPending ? "Sending…" : "Email not verified — click to resend"}
      </TooltipContent>
    </Tooltip>
  )
}

/** Full banner shown on first visit or after RESHOW_DAYS. */
function UnverifiedEmailBanner(
  props: Readonly<{
    onDismiss: () => void
    onResend: () => void
    isPending: boolean
    isSuccess: boolean
  }>,
) {
  const { onDismiss, onResend, isPending, isSuccess } = props

  return (
    <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      <MailWarning className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Your email address is not verified. Check your inbox or{" "}
        <button
          type="button"
          onClick={onResend}
          disabled={isPending || isSuccess}
          className="font-medium underline underline-offset-2 hover:text-amber-900 disabled:opacity-50 dark:hover:text-amber-100"
        >
          {isPending ? "Sending…" : "resend verification email"}
        </button>
        .
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Default component. App shell with sidebar, header, and content area. */
function Layout() {
  const { isUnverified, resendMutation } = useEmailVerification()
  const [dismissed, setDismissed] = useState(isBannerDismissed)

  const showBanner = isUnverified && !dismissed
  const showIndicator = isUnverified && dismissed

  const handleDismiss = () => {
    dismissBanner()
    setDismissed(true)
  }

  const handleResend = () => resendMutation.mutate()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <div className="ml-auto flex items-center gap-2">
            <SearchTrigger />
            <NotificationBell />
            {showIndicator && (
              <UnverifiedEmailIndicator
                onResend={handleResend}
                isPending={resendMutation.isPending}
                isSuccess={resendMutation.isSuccess}
              />
            )}
            <NavUserMenu />
          </div>
        </header>
        {showBanner && (
          <UnverifiedEmailBanner
            onDismiss={handleDismiss}
            onResend={handleResend}
            isPending={resendMutation.isPending}
            isSuccess={resendMutation.isSuccess}
          />
        )}
        <main className="min-w-0 flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <Footer />
        <FeedbackDialog />
      </SidebarInset>
    </SidebarProvider>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default Layout
