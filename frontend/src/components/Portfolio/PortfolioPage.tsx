/**
 * Portfolio Page Component
 * Main page with KPI bar, property grid, and add property button
 */

import { Building2, Plus, X } from "lucide-react"
import { useState } from "react"
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

/******************************************************************************
                              Constants
******************************************************************************/

const RENTFLOW_DISMISSED_KEY = "rentflow_prompt_dismissed"
const RENTFLOW_THRESHOLD = 6
// Replace with affiliate URL once partnership is established (Task #148)
const RENTFLOW_URL = "https://rentflow.de"

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

  const [rentflowDismissed, setRentflowDismissed] = useState(
    () => localStorage.getItem(RENTFLOW_DISMISSED_KEY) === "true",
  )

  const propertyCount = propertiesData?.data?.length ?? 0
  const showRentflowPrompt =
    !isLoadingProperties &&
    propertyCount >= RENTFLOW_THRESHOLD &&
    !rentflowDismissed

  const handleDismissRentflow = () => {
    localStorage.setItem(RENTFLOW_DISMISSED_KEY, "true")
    setRentflowDismissed(true)
  }

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

      {/* Rentflow hand-off prompt — shown when portfolio reaches 6+ properties */}
      {showRentflowPrompt && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Managing 6+ properties? Rentflow connects to 1,100+ German banks
              for automatic rent tracking and DATEV-ready accounting.
            </p>
            <a
              href={RENTFLOW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
            >
              Learn about Rentflow →
            </a>
          </div>
          <button
            type="button"
            onClick={handleDismissRentflow}
            aria-label="Dismiss Rentflow prompt"
            className="rounded p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
