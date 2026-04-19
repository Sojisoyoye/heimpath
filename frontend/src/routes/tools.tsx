import { createFileRoute, Outlet } from "@tanstack/react-router"

import { LandingFooter } from "@/components/Landing/LandingFooter"
import { LandingHeader } from "@/components/Landing/LandingHeader"
import { ToolsCta } from "@/components/Tools/ToolsCta"

export const Route = createFileRoute("/tools")({
  component: ToolsLayout,
})

function ToolsLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl p-6 md:p-8">
          <Outlet />
        </div>
      </main>
      <ToolsCta />
      <LandingFooter />
    </div>
  )
}
