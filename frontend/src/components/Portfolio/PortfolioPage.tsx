/**
 * Portfolio Page Component
 * Main page with KPI bar, property grid, and add property button
 */

import { Building2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCreateProperty } from "@/hooks/mutations/usePortfolioMutations"
import {
  usePortfolioPerformance,
  usePortfolioProperties,
  usePortfolioSummary,
} from "@/hooks/queries/usePortfolioQueries"
import useCustomToast from "@/hooks/useCustomToast"
import type { PortfolioPropertyInput } from "@/models/portfolio"
import { KpiSummaryBar } from "./KpiSummaryBar"
import { PerformanceChart } from "./PerformanceChart"
import { PropertyCard } from "./PropertyCard"
import { PropertyFormModal } from "./PropertyFormModal"
import { RentflowBanner } from "./RentflowBanner"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Portfolio overview page. */
function PortfolioPage() {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { data: propertiesData, isLoading: isLoadingProperties } =
    usePortfolioProperties()
  const { data: summary, isLoading: isLoadingSummary } = usePortfolioSummary()
  const { data: performance, isLoading: isLoadingPerformance } =
    usePortfolioPerformance()
  const createProperty = useCreateProperty()

  const handleCreateProperty = (input: PortfolioPropertyInput) => {
    createProperty.mutate(input, {
      onSuccess: () => showSuccessToast("Property added successfully"),
      onError: () => showErrorToast("Failed to add property"),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-6 w-6" />
            Portfolio
          </h1>
          <p className="text-muted-foreground">
            Manage your rental properties and track financial performance
          </p>
        </div>
        <PropertyFormModal
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          }
          onSubmit={handleCreateProperty}
          isPending={createProperty.isPending}
        />
      </div>

      {/* KPI Summary */}
      {isLoadingSummary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}
      {!isLoadingSummary && summary && <KpiSummaryBar summary={summary} />}

      {/* Performance Chart */}
      {isLoadingPerformance && <Skeleton className="h-[380px]" />}
      {!isLoadingPerformance && performance && (
        <PerformanceChart performance={performance} />
      )}

      {/* Section heading */}
      {!isLoadingProperties && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Properties</h2>
          <span className="text-sm text-muted-foreground">
            {propertiesData?.data?.length ?? 0}{" "}
            {propertiesData?.data?.length === 1 ? "property" : "properties"}
          </span>
        </div>
      )}

      {/* Rentflow hand-off prompt for large portfolios */}
      <RentflowBanner propertyCount={propertiesData?.data?.length ?? 0} />

      {/* Property Grid */}
      {isLoadingProperties && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}
      {!isLoadingProperties &&
        propertiesData?.data &&
        propertiesData.data.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {propertiesData.data.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      {!isLoadingProperties &&
        (!propertiesData?.data || propertiesData.data.length === 0) && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No properties yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your first rental property to start tracking your portfolio.
            </p>
            <PropertyFormModal
              trigger={
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              }
              onSubmit={handleCreateProperty}
              isPending={createProperty.isPending}
            />
          </div>
        )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PortfolioPage }
export default PortfolioPage
