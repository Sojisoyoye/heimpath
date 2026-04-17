/**
 * Professional Detail Page
 * Displays full profile with reviews
 */

import { createFileRoute } from "@tanstack/react-router"

import { ProfessionalDetail } from "@/components/Professionals"
import { useProfessional } from "@/hooks/queries"
import type { ProfessionalDetail as ProfessionalDetailType } from "@/models/professional"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/professionals/$professionalId")({
  component: ProfessionalDetailPage,
  head: () => ({
    meta: [{ title: "Professional - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Professional detail page. */
function ProfessionalDetailPage() {
  const { professionalId } = Route.useParams()

  const {
    data: professional,
    isLoading,
    error,
  } = useProfessional(professionalId)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load professional
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The professional could not be found or there was an error loading
            their profile.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || !professional) {
    return (
      <ProfessionalDetail
        professional={{} as ProfessionalDetailType}
        isLoading
      />
    )
  }

  return <ProfessionalDetail professional={professional} />
}

/******************************************************************************
                              Export
******************************************************************************/

export default ProfessionalDetailPage
