import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { MailWarning, X } from "lucide-react"
import { useState } from "react"

import { AuthService, type UserPublic, UsersService } from "@/client"
import { Footer } from "@/components/Common/Footer"
import { NavUserMenu } from "@/components/Common/NavUserMenu"
import NotificationBell from "@/components/Notifications/NotificationBell"
import { SearchTrigger } from "@/components/Search"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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

/** Banner shown when the logged-in user has not yet verified their email. */
function UnverifiedEmailBanner() {
  const [dismissed, setDismissed] = useState(false)
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

  if (dismissed || !user || user.email_verified !== false) return null

  return (
    <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      <MailWarning className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Your email address is not verified. Check your inbox or{" "}
        <button
          type="button"
          onClick={() => resendMutation.mutate()}
          disabled={resendMutation.isPending || resendMutation.isSuccess}
          className="font-medium underline underline-offset-2 hover:text-amber-900 disabled:opacity-50 dark:hover:text-amber-100"
        >
          {resendMutation.isPending ? "Sending…" : "resend verification email"}
        </button>
        .
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <div className="ml-auto flex items-center gap-2">
            <SearchTrigger />
            <NotificationBell />
            <NavUserMenu />
          </div>
        </header>
        <UnverifiedEmailBanner />
        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout
