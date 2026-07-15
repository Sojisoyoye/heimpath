/**
 * Public Layout
 * Pathless layout (no URL segment) for content pages that must be readable
 * by anonymous visitors — Articles, Glossary, and Laws (freemium top-of-
 * funnel). Unlike `_layout`, this route has NO auth guard.
 *
 * The shell intentionally reuses `AppSidebar` (safe for anonymous users —
 * it degrades gracefully when `currentUser` is undefined) but does NOT
 * reuse the authenticated header widgets from `_layout` (NavUserMenu,
 * ActivityHistoryButton, NotificationBell) since those assume a logged-in
 * user and either crash, misrender, or fire authenticated-only API calls
 * for anonymous visitors. Instead it shows a simple login/signup CTA.
 */

import { createFileRoute, Link, Outlet } from "@tanstack/react-router"

import { Footer } from "@/components/Common/Footer"
import { SearchTrigger } from "@/components/Search"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
})

/******************************************************************************
                              Components
******************************************************************************/

/** Login/signup call-to-action shown to anonymous visitors in the header. */
function AuthCta() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" asChild>
        <Link to="/login">Log in</Link>
      </Button>
      <Button asChild>
        <Link to="/signup">Sign up free</Link>
      </Button>
    </div>
  )
}

/** Default component. Public app shell — sidebar + minimal header, no auth guard. */
function PublicLayout() {
  const showAuthCta = !isLoggedIn()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background px-4">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <div className="ml-auto flex items-center gap-2">
            <SearchTrigger />
            {showAuthCta && <AuthCta />}
          </div>
        </header>
        <main className="min-w-0 flex-1 p-6 pb-36 sm:pb-20 md:px-8 md:pt-8 md:pb-20">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default PublicLayout
