/**
 * Glossary Term Detail Page
 * Displays full glossary term with definition, example, and related terms
 */

import { createFileRoute } from "@tanstack/react-router"

import { GlossaryDetail } from "@/components/Glossary"
import { useGlossaryTerm } from "@/hooks/queries"
import type { GlossaryTermDetail } from "@/models/glossary"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/glossary/$slug")({
  component: GlossaryTermPage,
  head: () => ({
    meta: [{ title: "Glossary Term - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Glossary term detail page. */
function GlossaryTermPage() {
  const { slug } = Route.useParams()

  const { data: term, isLoading, error } = useGlossaryTerm(slug)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Term not found
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The glossary term could not be found or there was an error loading
            it.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || !term) {
    return <GlossaryDetail term={{} as GlossaryTermDetail} isLoading />
  }

  return <GlossaryDetail term={term} />
}

/******************************************************************************
                              Export
******************************************************************************/

export default GlossaryTermPage
