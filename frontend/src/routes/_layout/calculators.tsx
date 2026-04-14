/**
 * Calculators Page
 * Financial calculators for property investment
 */

import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowUpDown,
  Calculator,
  ClipboardList,
  Euro,
  Landmark,
  TrendingUp,
} from "lucide-react"
import {
  FinancingWizard,
  HiddenCostsCalculator,
  PropertyEvaluationCalculator,
  ROICalculator,
  StateComparison,
} from "@/components/Calculators"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/calculators")({
  component: CalculatorsPage,
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: (search.tab as string) || undefined,
  }),
  head: () => ({
    meta: [{ title: "Calculators - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Calculators page with tabs. */
function CalculatorsPage() {
  const { tab } = Route.useSearch()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Financial Calculators
        </h1>
        <p className="text-muted-foreground">
          Plan your property investment with our financial tools
        </p>
      </div>

      <Tabs defaultValue={tab || "costs"}>
        <TabsList className="flex w-full">
          <TabsTrigger
            value="costs"
            className="gap-2"
            aria-label="Hidden Costs"
          >
            <Euro className="h-4 w-4" />
            <span className="hidden sm:inline">Hidden Costs</span>
          </TabsTrigger>
          <TabsTrigger
            value="roi"
            className="gap-2"
            aria-label="ROI Calculator"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">ROI Calculator</span>
          </TabsTrigger>
          <TabsTrigger
            value="compare"
            className="gap-2"
            aria-label="State Comparison"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">State Comparison</span>
          </TabsTrigger>
          <TabsTrigger
            value="financing"
            className="gap-2"
            aria-label="Financing"
          >
            <Landmark className="h-4 w-4" />
            <span className="hidden sm:inline">Financing</span>
          </TabsTrigger>
          <TabsTrigger
            value="property-evaluation"
            className="gap-2"
            aria-label="Property Evaluation"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Property Evaluation</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="costs" className="mt-6">
          <HiddenCostsCalculator />
        </TabsContent>

        <TabsContent value="roi" className="mt-6">
          <ROICalculator />
        </TabsContent>

        <TabsContent value="compare" className="mt-6">
          <StateComparison />
        </TabsContent>

        <TabsContent value="financing" className="mt-6">
          <FinancingWizard />
        </TabsContent>

        <TabsContent value="property-evaluation" className="mt-6">
          <PropertyEvaluationCalculator />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default CalculatorsPage
