/**
 * Generic Content Search Component
 * Reusable search UI for any content type (laws, glossary, articles)
 */

import { Search, X } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSearchQuery } from "@/hooks/useSearchQuery"
import { SearchResultsList } from "./SearchResultsList"

interface IProps<TData> {
  placeholder: string
  entityLabel: string
  useSearchHook: (query: string) => {
    data: TData | undefined
    isLoading: boolean
    error: Error | null
  }
  getCount: (data: TData) => number
  renderResults: (data: TData) => ReactNode
  onQueryChange?: (query: string) => void
  initialQuery?: string
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Generic search interface that handles debounce, loading, error, and empty states. */
function ContentSearch<TData>(props: Readonly<IProps<TData>>) {
  const {
    placeholder,
    entityLabel,
    useSearchHook,
    getCount,
    renderResults,
    onQueryChange,
    initialQuery,
    className,
  } = props

  const { query, setQuery, debouncedQuery, handleClear } = useSearchQuery(
    initialQuery,
    onQueryChange,
  )
  const { data, isLoading, error } = useSearchHook(debouncedQuery)

  const showResults = debouncedQuery.length >= 2
  const count = data !== undefined ? getCount(data) : undefined

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-muted-foreground">
          Type at least 2 characters to search
        </p>
      )}

      {showResults && (
        <SearchResultsList
          isLoading={isLoading}
          error={error}
          count={count}
          entityLabel={entityLabel}
          debouncedQuery={debouncedQuery}
        >
          {data && renderResults(data)}
        </SearchResultsList>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ContentSearch }
