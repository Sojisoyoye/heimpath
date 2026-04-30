/**
 * Law Search Component
 * Search interface for German property laws
 */

import { ContentSearch } from "@/components/Common/ContentSearch"
import { useLawSearch } from "@/hooks/queries"
import { LawCard } from "./LawCard"

interface IProps {
  onQueryChange?: (query: string) => void
  initialQuery?: string
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Law search with results grid. */
function LawSearch(props: Readonly<IProps>) {
  return (
    <ContentSearch
      {...props}
      placeholder="Search German property laws..."
      entityLabel="law"
      useSearchHook={useLawSearch}
      getCount={(data) => data.total}
      renderResults={(data) => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.results.map((law) => (
            <LawCard key={law.id} law={law} />
          ))}
        </div>
      )}
    />
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { LawSearch }
