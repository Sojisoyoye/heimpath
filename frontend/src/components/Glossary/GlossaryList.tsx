/**
 * Glossary List Component
 * Paginated listing of glossary terms with category filter
 */

import { Languages, Loader2 } from "lucide-react"
import { useState } from "react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useGlossaryCategories, useGlossaryTerms } from "@/hooks/queries"
import type { GlossaryCategory, GlossaryFilter } from "@/models/glossary"
import { CATEGORY_LABELS, GlossaryCard } from "./GlossaryCard"

interface IProps {
  initialCategory?: GlossaryCategory
  showCategoryFilter?: boolean
  pageSize?: number
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Loading skeleton for glossary list. */
function GlossaryListSkeleton(props: Readonly<{ count?: number }>) {
  const { count = 9 } = props

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`skeleton-${i}`} className="space-y-3 rounded-lg border p-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

/** Empty state when no terms found. */
function EmptyState(props: Readonly<{ category?: GlossaryCategory }>) {
  const { category } = props

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Languages className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No terms found</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {category
          ? "No terms found in this category. Try selecting a different category."
          : "We're building a comprehensive glossary of 120+ German real estate terms. This feature is coming soon."}
      </p>
    </div>
  )
}

/** Category filter bar. */
function CategoryFilterBar(
  props: Readonly<{
    selected?: GlossaryCategory
    onChange: (category: GlossaryCategory | undefined) => void
  }>,
) {
  const { selected, onChange } = props
  const { data: categories } = useGlossaryCategories()

  const allCategories: GlossaryCategory[] = [
    "buying_process",
    "costs_taxes",
    "financing",
    "legal",
    "rental",
    "property_types",
  ]

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selected ? "outline" : "default"}
        size="sm"
        onClick={() => onChange(undefined)}
      >
        All
      </Button>
      {allCategories.map((cat) => {
        const count = categories?.find((c) => c.id === cat)?.count
        return (
          <Button
            key={cat}
            variant={selected === cat ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(cat)}
            className="gap-1"
          >
            {CATEGORY_LABELS[cat]}
            {count !== undefined && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {count}
              </Badge>
            )}
          </Button>
        )
      })}
    </div>
  )
}

/** Default component. Paginated glossary list with filters. */
function GlossaryList(props: Readonly<IProps>) {
  const {
    initialCategory,
    showCategoryFilter = true,
    pageSize = 21,
    className,
  } = props

  const [filter, setFilter] = useState<GlossaryFilter>({
    category: initialCategory,
    page: 1,
    pageSize,
  })

  const { data, isLoading, error, isFetching } = useGlossaryTerms(filter)

  const handleCategoryChange = (category: GlossaryCategory | undefined) => {
    setFilter((prev) => ({ ...prev, category, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilter((prev) => ({ ...prev, page }))
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return (
    <div className={cn("space-y-6", className)}>
      {showCategoryFilter && (
        <CategoryFilterBar
          selected={filter.category}
          onChange={handleCategoryChange}
        />
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">
            Failed to load glossary terms. Please try again.
          </p>
        </div>
      )}

      {isLoading && <GlossaryListSkeleton count={pageSize} />}

      {!isLoading &&
        !error &&
        data &&
        (data.data.length === 0 ? (
          <EmptyState category={filter.category} />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {data.data.length} of {data.total} terms
                {isFetching && (
                  <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                )}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((term) => (
                <GlossaryCard
                  key={term.id}
                  term={term}
                  showCategory={!filter.category}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filter.page! - 1)}
                  disabled={filter.page === 1 || isFetching}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {filter.page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filter.page! + 1)}
                  disabled={filter.page === totalPages || isFetching}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ))}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { GlossaryList }
