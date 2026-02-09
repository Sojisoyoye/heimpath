/**
 * Law List Component
 * Paginated listing of laws with filters
 */

import { useState } from "react"
import { Scale, Loader2 } from "lucide-react"

import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLaws } from "@/hooks/queries"
import { CategoryFilter } from "./CategoryFilter"
import { LawCard } from "./LawCard"
import type { LawCategoryType, LawFilter } from "@/models/legal"

interface IProps {
  initialCategory?: LawCategoryType
  showCategoryFilter?: boolean
  pageSize?: number
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Loading skeleton for law list. */
function LawListSkeleton(props: { count?: number }) {
  const { count = 6 } = props

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  )
}

/** Empty state when no laws found. */
function EmptyState(props: { category?: LawCategoryType }) {
  const { category } = props

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Scale className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No laws found</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {category
          ? `No laws found in this category. Try selecting a different category.`
          : `No laws available. Check back later for updates.`}
      </p>
    </div>
  )
}

/** Default component. Paginated law list with filters. */
function LawList(props: IProps) {
  const {
    initialCategory,
    showCategoryFilter = true,
    pageSize = 12,
    className,
  } = props

  const [filter, setFilter] = useState<LawFilter>({
    category: initialCategory,
    page: 1,
    pageSize,
  })

  const { data, isLoading, error, isFetching } = useLaws(filter)

  const handleCategoryChange = (category: LawCategoryType | undefined) => {
    setFilter((prev) => ({ ...prev, category, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilter((prev) => ({ ...prev, page }))
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return (
    <div className={cn("space-y-6", className)}>
      {showCategoryFilter && (
        <CategoryFilter
          selectedCategory={filter.category}
          onCategoryChange={handleCategoryChange}
        />
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">
            Failed to load laws. Please try again.
          </p>
        </div>
      )}

      {isLoading && <LawListSkeleton count={pageSize} />}

      {!isLoading && !error && data && (
        <>
          {data.data.length === 0 ? (
            <EmptyState category={filter.category} />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {data.data.length} of {data.total} laws
                  {isFetching && (
                    <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                  )}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.data.map((law) => (
                  <LawCard
                    key={law.id}
                    law={law}
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
          )}
        </>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { LawList }
