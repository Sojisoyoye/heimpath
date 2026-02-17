/**
 * New Journey Page
 * Multi-step wizard for creating a personalized property buying journey
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { JourneyWizard } from "@/components/Journey"
import { Button } from "@/components/ui/button"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/journeys/new")({
  component: NewJourneyPage,
  head: () => ({
    meta: [{ title: "Create Journey - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. New journey page with wizard. */
function NewJourneyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/journeys">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Journey</h1>
          <p className="text-muted-foreground">
            Answer a few questions to get your personalized property buying
            guide
          </p>
        </div>
      </div>

      <JourneyWizard className="mx-auto max-w-4xl" />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default NewJourneyPage
