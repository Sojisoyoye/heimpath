/**
 * New Journey Page
 * Placeholder for journey creation wizard (full implementation in subtask 11.5)
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Compass } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

/** Default component. New journey page (wizard placeholder). */
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
            Start your personalized property buying journey
          </p>
        </div>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Compass className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="mt-4">Journey Creation Wizard</CardTitle>
          <CardDescription>
            Answer a few questions to get a personalized property buying journey
            tailored to your situation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            The journey creation wizard will help you:
          </p>
          <ul className="mx-auto max-w-sm space-y-2 text-left text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
              Select your property type and location
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
              Define your budget and financing approach
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
              Set your timeline and target date
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
              Get personalized steps based on your citizenship status
            </li>
          </ul>
          <div className="pt-4">
            <p className="text-xs text-muted-foreground italic">
              Full wizard coming soon in the next update.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default NewJourneyPage
