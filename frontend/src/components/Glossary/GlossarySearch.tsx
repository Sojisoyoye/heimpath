/**
 * Glossary Search Component
 * Search interface for German real estate terms
 */

import { ContentSearch } from "@/components/Common/ContentSearch"
import { useGlossarySearch } from "@/hooks/queries"
import { GlossaryCard } from "./GlossaryCard"

interface IProps {
  onQueryChange?: (query: string) => void
  initialQuery?: string
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Glossary search with results grid. */
function GlossarySearch(props: Readonly<IProps>) {
  return (
    <ContentSearch
      {...props}
      placeholder="Search German terms, e.g. Grunderwerbsteuer..."
      entityLabel="term"
      useSearchHook={useGlossarySearch}
      getCount={(data) => data.total}
      renderResults={(data) => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.results.map((term) => (
            <GlossaryCard key={term.id} term={term} />
          ))}
        </div>
      )}
    />
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { GlossarySearch }
