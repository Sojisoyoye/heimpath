/**
 * Law Detail Page
 * Displays full law details with court rulings and state variations
 */

import { createFileRoute } from "@tanstack/react-router"

import { seoMeta } from "@/common/seo"
import { LawDetail } from "@/components/Legal"
import { lawQueryOptions, useLaw } from "@/hooks/queries"
import type { LawDetail as LawDetailType } from "@/models/legal"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_public/laws/$lawId")({
  component: LawDetailPage,
  // Swallow fetch errors (e.g. 404 on a bad/stale id) instead of letting
  // them throw and bounce anonymous visitors to the generic root error page
  // — the component below already renders a friendly in-page error state
  // via `useLaw`'s `error` field.
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData(lawQueryOptions(params.lawId))
      .catch(() => undefined),
  head: ({ loaderData, params }) =>
    seoMeta({
      title: loaderData
        ? `${loaderData.titleEn} - HeimPath Legal Knowledge Base`
        : "Law Details - HeimPath",
      description: loaderData?.shortSummary || loaderData?.oneLineSummary,
      path: `/laws/${params.lawId}`,
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
