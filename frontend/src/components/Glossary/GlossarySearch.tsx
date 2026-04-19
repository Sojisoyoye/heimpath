/**
 * Glossary Search Component
 * Search interface for glossary terms with debounced input
 */

import { Loader2, Search, X } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGlossarySearch } from "@/hooks/queries"
import { GlossaryCard } from "./GlossaryCard"

interface IProps {
  className?: string
}

/******************************************************************************
                              Functions
******************************************************************************/

function formatResultCount(total: number): string {
  if (total === 0) return "No results found"
  const suffix = total === 1 ? "" : "s"
  return `Found ${total} term${suffix}`
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Glossary search interface with results. */
function GlossarySearch(props: Readonly<IProps>) {
  const { className } = props

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const { data, isLoading, error } = useGlossarySearch(debouncedQuery)

  const handleClear = () => {
    setQuery("")
    setDebouncedQuery("")
  }

  const showResults = debouncedQuery.length >= 2

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search German terms, e.g. Grunderwerbsteuer..."
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
        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Searching...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <p className="text-sm text-destructive">
                Failed to search. Please try again.
              </p>
            </div>
          )}

          {data && !isLoading && (
            <>
              <p className="text-sm text-muted-foreground">
                {formatResultCount(data.total)}
              </p>

              {data.results.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.results.map((term) => (
                    <GlossaryCard key={term.id} term={term} />
                  ))}
                </div>
              )}

              {data.total === 0 && (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No terms found for &quot;{debouncedQuery}&quot;
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try different keywords or browse by category
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { GlossarySearch }
