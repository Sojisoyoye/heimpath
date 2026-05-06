/**
 * Journeys List Page
 * Displays all user journeys
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useState } from "react"
import { DeleteJourneyDialog, JourneyList } from "@/components/Journey"
import { Button } from "@/components/ui/button"
import { useDeleteJourney } from "@/hooks/mutations/useJourneyMutations"
import { useJourneys } from "@/hooks/queries"
import useCustomToast from "@/hooks/useCustomToast"

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
  const deleteJourney = useDeleteJourney()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDeleteConfirm = () => {
    if (!deleteId) return
    deleteJourney.mutate(deleteId, {
      onSuccess: () => {
        showSuccessToast("Journey deleted successfully")
        setDeleteId(null)
      },
      onError: () => {
        showErrorToast("Failed to delete journey. Please try again.")
      },
    })
  }

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
        <JourneyList
          journeys={journeys}
          isLoading={isLoading}
          onDelete={setDeleteId}
        />
      )}

      <DeleteJourneyDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        onConfirm={handleDeleteConfirm}
        isPending={deleteJourney.isPending}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default JourneysPage
