/**
 * Journey Detail Page
 * Displays a single journey with all steps
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { JOURNEY_PHASES } from "@/common/constants"
import { DeleteJourneyDialog, JourneyDetail } from "@/components/Journey"
import {
  useDeleteJourney,
  useUpdateStep,
  useUpdateTask,
} from "@/hooks/mutations/useJourneyMutations"
import { useJourney, useJourneyProgress } from "@/hooks/queries"
import { useCelebration } from "@/hooks/useCelebration"
import useCustomToast from "@/hooks/useCustomToast"
import type { JourneyPhase } from "@/models/journey"

/******************************************************************************
                              Route
******************************************************************************/

const VALID_PHASES = new Set<string>(JOURNEY_PHASES.map((p) => p.key))

export const Route = createFileRoute("/_layout/journeys/$journeyId/")({
  component: JourneyDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    phase: VALID_PHASES.has(String(search.phase ?? ""))
      ? (search.phase as JourneyPhase)
      : undefined,
  }),
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
  const { phase: initialPhase } = Route.useSearch()
  const navigate = useNavigate()

  const {
    data: journey,
    isLoading: isLoadingJourney,
    error: journeyError,
  } = useJourney(journeyId)

  const { data: progress } = useJourneyProgress(journeyId)
  const updateTask = useUpdateTask(journeyId)
  const updateStep = useUpdateStep(journeyId)
  const deleteJourney = useDeleteJourney()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  useCelebration(journey?.steps ?? [])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleTaskToggle = (
    stepId: string,
    taskId: string,
    isCompleted: boolean,
  ) => {
    updateTask.mutate({ stepId, taskId, data: { is_completed: isCompleted } })
  }

  const handleStepOpen = (stepId: string) => {
    updateStep.mutate({ stepId, data: { status: "in_progress" } })
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
        onStepOpen={handleStepOpen}
        onDelete={() => setShowDeleteDialog(true)}
        initialPhase={initialPhase}
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
