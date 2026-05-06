/**
 * Law Detail Page
 * Displays full law details with court rulings and state variations
 */

import { createFileRoute } from "@tanstack/react-router"

import { LawDetail } from "@/components/Legal"
import { useLaw } from "@/hooks/queries"
import type { LawDetail as LawDetailType } from "@/models/legal"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/laws/$lawId")({
  component: LawDetailPage,
  head: () => ({
    meta: [{ title: "Law Details - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Law detail page. */
function LawDetailPage() {
  const { lawId } = Route.useParams()

  const { data: law, isLoading, error } = useLaw(lawId)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load law
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The law could not be found or there was an error loading it.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || !law) {
    return <LawDetail law={{} as LawDetailType} isLoading />
  }

  return <LawDetail law={law} />
}

/******************************************************************************
                              Export
******************************************************************************/

export default LawDetailPage
