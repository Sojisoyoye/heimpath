/**
 * Journey Detail Page
 * Displays a single journey with all steps
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { DeleteJourneyDialog, JourneyDetail } from "@/components/Journey"
import {
  useDeleteJourney,
  useUpdateTask,
} from "@/hooks/mutations/useJourneyMutations"
import { useJourney, useJourneyProgress } from "@/hooks/queries"
import useCustomToast from "@/hooks/useCustomToast"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/journeys/$journeyId/")({
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
  const navigate = useNavigate()

  const {
    data: journey,
    isLoading: isLoadingJourney,
    error: journeyError,
  } = useJourney(journeyId)

  const { data: progress } = useJourneyProgress(journeyId)
  const updateTask = useUpdateTask(journeyId)
  const deleteJourney = useDeleteJourney()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleTaskToggle = (
    stepId: string,
    taskId: string,
    isCompleted: boolean,
  ) => {
    updateTask.mutate({ stepId, taskId, data: { is_completed: isCompleted } })
  }

  const handleDeleteConfirm = () => {
    deleteJourney.mutate(journeyId, {
      onSuccess: () => {
        showSuccessToast("Journey deleted successfully")
        navigate({ to: "/journeys" })
      },
      onError: () => {
        showErrorToast("Failed to delete journey. Please try again.")
      },
    })
  }

  if (journeyError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load journey
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The journey could not be found or you don&apos;t have access to it.
          </p>
        </div>
      </div>
    )
  }

  if (isLoadingJourney || !journey) {
    return <JourneyDetail onTaskToggle={() => {}} isLoading />
  }

  return (
    <>
      <JourneyDetail
        journey={journey}
        progress={progress}
        onTaskToggle={handleTaskToggle}
        onDelete={() => setShowDeleteDialog(true)}
      />
      <DeleteJourneyDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteConfirm}
        isPending={deleteJourney.isPending}
      />
    </>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default JourneyDetailPage
