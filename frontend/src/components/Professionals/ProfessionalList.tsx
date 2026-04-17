/**
 * Professional List Component
 * Grid of professional cards with filters and loading/empty states
 */

import { UserCheck } from "lucide-react"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfessionals } from "@/hooks/queries"
import type { ProfessionalFilter } from "@/models/professional"
import { ProfessionalCard } from "./ProfessionalCard"
import { ProfessionalFilters } from "./ProfessionalFilters"

/******************************************************************************
                              Components
******************************************************************************/

/** Loading skeleton for professional cards. */
function ProfessionalCardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

/** Default component. Professional directory list with filters. */
function ProfessionalList() {
  const [filters, setFilters] = useState<ProfessionalFilter>({
    page: 1,
    pageSize: 20,
  })

  const { data, isLoading, error } = useProfessionals(filters)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ProfessionalFilters filters={filters} onFiltersChange={setFilters} />

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load professionals. Please try again.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ProfessionalCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && data?.data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <UserCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No professionals found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your filters to find professionals.
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && data && data.data.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {data.data.length} of {data.total} professionals
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((professional) => (
              <ProfessionalCard
                key={professional.id}
                professional={professional}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ProfessionalList }
