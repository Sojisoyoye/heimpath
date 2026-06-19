import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { CreateViewingDialog } from "@/components/ViewingChecklist/CreateViewingDialog"
import { DEFAULT_CHECKLIST } from "@/components/ViewingChecklist/checklistTemplate"
import { ViewingDetail } from "@/components/ViewingChecklist/ViewingDetail"
import { ViewingList } from "@/components/ViewingChecklist/ViewingList"
import {
  useCreateViewing,
  useDeleteViewing,
  useUpdateViewing,
} from "@/hooks/mutations/useViewingMutations"
import { useViewing, useViewings } from "@/hooks/queries/useViewingQueries"
import useCustomToast from "@/hooks/useCustomToast"
import type { PropertyViewingUpdate } from "@/models/viewing"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/viewing-checklist")({
  component: ViewingChecklistPage,
  validateSearch: (search: Record<string, unknown>) => ({
    viewingId:
      typeof search.viewingId === "string" ? search.viewingId : undefined,
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

function DetailView(
  props: Readonly<{ viewingId: string; onBack: () => void }>,
) {
  const { viewingId, onBack } = props
  const { data: viewing, isLoading } = useViewing(viewingId)
  const updateViewing = useUpdateViewing()

  if (isLoading || !viewing) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <ViewingDetail
      viewing={viewing}
      isSaving={updateViewing.isPending}
      onBack={onBack}
      onUpdate={(updates: PropertyViewingUpdate) =>
        updateViewing.mutate({ id: viewingId, updates })
      }
    />
  )
}

/** Default component. Property viewing checklist page — list or detail view. */
function ViewingChecklistPage() {
  const navigate = useNavigate()
  const { viewingId } = Route.useSearch()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: list, isLoading } = useViewings()
  const createViewing = useCreateViewing()
  const updateViewing = useUpdateViewing()
  const deleteViewing = useDeleteViewing()

  const [dialogOpen, setDialogOpen] = useState(false)

  const goToDetail = (id: string) =>
    void navigate({
      to: "/viewing-checklist",
      search: (prev) => ({ ...prev, viewingId: id }),
    })

  const goToList = () =>
    void navigate({
      to: "/viewing-checklist",
      search: (prev) => ({ ...prev, viewingId: undefined }),
    })

  const handleCreate = (address: string, viewedAt?: string) => {
    createViewing.mutate(
      { address, viewedAt },
      {
        onSuccess: (viewing) => {
          updateViewing.mutate(
            { id: viewing.id, updates: { checklistData: DEFAULT_CHECKLIST } },
            {
              onSuccess: () => {
                setDialogOpen(false)
                goToDetail(viewing.id)
                showSuccessToast("Viewing created")
              },
              onError: () => showErrorToast("Failed to initialise checklist"),
            },
          )
        },
        onError: () => showErrorToast("Failed to create viewing"),
      },
    )
  }

  const handleDelete = (id: string) => {
    deleteViewing.mutate(id, {
      onSuccess: () => {
        showSuccessToast("Viewing deleted")
        if (viewingId === id) goToList()
      },
      onError: () => showErrorToast("Failed to delete viewing"),
    })
  }

  if (viewingId) {
    // key={viewingId} forces remount when navigating between viewings so that
    // localNotes in ViewingDetail resets to the new viewing's notes.
    return (
      <DetailView key={viewingId} viewingId={viewingId} onBack={goToList} />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <>
      <ViewingList
        viewings={list?.data ?? []}
        isDeleting={deleteViewing.isPending}
        onSelect={goToDetail}
        onCreate={() => setDialogOpen(true)}
        onDelete={handleDelete}
      />
      <CreateViewingDialog
        open={dialogOpen}
        isCreating={createViewing.isPending || updateViewing.isPending}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </>
  )
}
