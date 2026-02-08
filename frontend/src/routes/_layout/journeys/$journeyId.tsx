/**
 * Journey Detail Page
 * Displays a single journey with all steps
 */

import { createFileRoute } from "@tanstack/react-router"

import { JourneyDetail } from "@/components/Journey"
import { useJourney, useJourneyProgress } from "@/hooks/queries"
import { useUpdateTask } from "@/hooks/mutations"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/journeys/$journeyId")({
  component: JourneyDetailPage,
  head: () => ({
    meta: [{ title: "Journey Details - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Journey detail page. */
function JourneyDetailPage() {
  const { journeyId } = Route.useParams()

  const {
    data: journey,
    isLoading: isLoadingJourney,
    error: journeyError,
  } = useJourney(journeyId)

  const { data: progress } = useJourneyProgress(journeyId)

  // We need the stepId for the mutation, so we'll track it when toggling
  const updateTaskMutation = useUpdateTask(journeyId, "")

  const handleTaskToggle = (
    stepId: string,
    taskId: string,
    isCompleted: boolean
  ) => {
    // Note: The mutation hook needs to be called with the correct stepId
    // For now, we'll use a simplified approach
    // In a real app, you'd want to handle this more elegantly
    console.log("Toggle task:", { stepId, taskId, isCompleted })
    // TODO: Implement proper task toggle with correct stepId
  }

  if (journeyError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load journey
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The journey could not be found or you don't have access to it.
          </p>
        </div>
      </div>
    )
  }

  if (isLoadingJourney || !journey) {
    return <JourneyDetail journey={{} as any} onTaskToggle={() => {}} isLoading />
  }

  return (
    <JourneyDetail
      journey={journey}
      progress={progress}
      onTaskToggle={handleTaskToggle}
    />
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default JourneyDetailPage
