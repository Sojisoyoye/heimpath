import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import {
  ArrowRight,
  BookOpen,
  Calculator,
  type FileText,
  History,
  MailWarning,
  MapIcon,
  Upload,
  X,
} from "lucide-react"
import { useState } from "react"

import { AuthService, type UserPublic, UsersService } from "@/client"
import { cn } from "@/common/utils"
import { Footer } from "@/components/Common/Footer"
import { NavUserMenu } from "@/components/Common/NavUserMenu"
import { FeedbackDialog } from "@/components/Feedback/FeedbackDialog"
import NotificationBell from "@/components/Notifications/NotificationBell"
import { SearchTrigger } from "@/components/Search"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useDashboardOverview } from "@/hooks/queries/useDashboardQueries"
import { isLoggedIn } from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import type { ActivityItem, ActivityType } from "@/models/dashboard"
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

/******************************************************************************
                        Activity History
******************************************************************************/

const ACTIVITY_ICONS_NAV: Record<ActivityType, typeof FileText> = {
  journey_started: MapIcon,
  step_completed: ArrowRight,
  document_uploaded: Upload,
  calculation_saved: Calculator,
  roi_calculated: Calculator,
  financing_assessed: Calculator,
  law_bookmarked: BookOpen,
}

const ACTIVITY_COLORS_NAV: Record<ActivityType, string> = {
  journey_started: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  step_completed: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  document_uploaded: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
  calculation_saved: "text-orange-600 bg-orange-50 dark:bg-orange-950/30",
  roi_calculated: "text-orange-600 bg-orange-50 dark:bg-orange-950/30",
  financing_assessed: "text-orange-600 bg-orange-50 dark:bg-orange-950/30",
  law_bookmarked: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30",
}

/** Single activity row inside the popover. */
function ActivityRow({ item }: Readonly<{ item: ActivityItem }>) {
  const Icon = ACTIVITY_ICONS_NAV[item.activityType] ?? History
  const colorClass =
    ACTIVITY_COLORS_NAV[item.activityType] ??
    "text-gray-600 bg-gray-50 dark:bg-gray-950/30"

  const now = Date.now()
  const then = new Date(item.timestamp).getTime()
  const diffMin = Math.floor((now - then) / 60_000)
  const relativeTime =
    diffMin < 1
      ? "Just now"
      : diffMin < 60
        ? `${diffMin}m ago`
        : diffMin < 1440
          ? `${Math.floor(diffMin / 60)}h ago`
          : `${Math.floor(diffMin / 1440)}d ago`

  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          colorClass,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.description}
        </p>
        <p className="text-xs text-muted-foreground">{relativeTime}</p>
      </div>
    </div>
  )
}

/** History icon button in the navbar — shows recent activity in a dropdown. */
function ActivityHistoryButton() {
  const { data } = useDashboardOverview()
  const activities = data?.recentActivity ?? []

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label="Recent activity"
        >
          <History className="h-4 w-4" />
          {activities.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {Math.min(activities.length, 9)}
              {activities.length > 9 ? "+" : ""}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="border-b px-4 py-2 font-semibold">
          Recent Activity
        </DropdownMenuLabel>
        <div className="max-h-[400px] divide-y overflow-y-auto px-4">
          {activities.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No activity yet
            </p>
          ) : (
            activities
              .slice(0, 10)
              .map((item, idx) => (
                <ActivityRow key={`${item.entityId}-${idx}`} item={item} />
              ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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
            <ActivityHistoryButton />
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
