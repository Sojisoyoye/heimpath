/**
 * Property Evaluation Calculator Route
 * Full-page calculator for investment property analysis within a journey
 */

import { createFileRoute } from "@tanstack/react-router"

import { PropertyEvaluationCalculator } from "@/components/Calculators/PropertyEvaluationCalculator"
import { Skeleton } from "@/components/ui/skeleton"
import { useJourney } from "@/hooks/queries"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute(
  "/_layout/journeys/$journeyId/property-evaluation",
)({
  component: PropertyEvaluationPage,
  head: () => ({
    meta: [{ title: "Property Evaluation Calculator - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Loading skeleton. */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    </div>
  )
}

/** Default component. Property evaluation page. */
function PropertyEvaluationPage() {
  const { journeyId } = Route.useParams()

  const { data: journey, isLoading } = useJourney(journeyId)

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <PropertyEvaluationCalculator
      journeyId={journeyId}
      initialState={journey?.property_location}
      initialBudget={journey?.budget_euros}
    />
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default PropertyEvaluationPage
