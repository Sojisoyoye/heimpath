/**
 * Search Results List Component
 * Shared loading/error/count/empty-state wrapper for search pages
 */

import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"

interface IProps {
  isLoading: boolean
  error: unknown
  count: number | undefined
  entityLabel: string
  debouncedQuery: string
  children: ReactNode
}

/******************************************************************************
                              Components
******************************************************************************/

/** Shared search results container with loading, error, count, and empty states. */
function SearchResultsList(props: Readonly<IProps>) {
  const { isLoading, error, count, entityLabel, debouncedQuery, children } =
    props

  const hasData = count !== undefined

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Searching...</span>
        </div>
      )}

      {!!error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">
            Failed to search. Please try again.
          </p>
        </div>
      )}

      {hasData && !isLoading && (
        <>
          <p className="text-sm text-muted-foreground">
            {count === 0
              ? "No results found"
              : `Found ${count} ${entityLabel}${count !== 1 ? "s" : ""}`}
          </p>

          {count > 0 && children}

          {count === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                No {entityLabel}s found for &quot;{debouncedQuery}&quot;
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try different keywords or browse by category
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { SearchResultsList }
