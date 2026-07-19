/**
 * Public Layout
 * Pathless layout (no URL segment) for content pages that must be readable
 * by anonymous visitors — Articles, Glossary, and Laws (freemium top-of-
 * funnel). Unlike `_layout`, this route has NO auth guard, and unlike the
 * authenticated app shell it has NO sidebar — matches the `/tools` layout
 * pattern (LandingHeader + plain container + LandingFooter), since these
 * are marketing-adjacent pages, not the in-app experience. This also
 * avoids the SidebarProvider mount/unmount transition that caused a visible
 * layout jump when navigating back to the landing page (which has no
 * sidebar either).
 */

import { createFileRoute, Outlet } from "@tanstack/react-router"

import { LandingFooter } from "@/components/Landing/LandingFooter"
import { LandingHeader } from "@/components/Landing/LandingHeader"

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Public app shell — no sidebar, no auth guard. */
function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <Outlet />
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default PublicLayout
