/**
 * Journeys List Page
 * Displays all user journeys
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { JourneyList } from "@/components/Journey"
import { useJourneys } from "@/hooks/queries"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/journeys/")({
  component: JourneysPage,
  head: () => ({
    meta: [{ title: "My Journeys - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Journeys list page. */
function JourneysPage() {
  const { data: journeys = [], isLoading, error } = useJourneys()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Journeys</h1>
          <p className="text-muted-foreground">
            Track your property buying progress
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/journeys/new">
            <Plus className="h-4 w-4" />
            New Journey
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-destructive">
            Failed to load journeys. Please try again.
          </p>
        </div>
      ) : (
        <JourneyList journeys={journeys} isLoading={isLoading} />
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default JourneysPage
