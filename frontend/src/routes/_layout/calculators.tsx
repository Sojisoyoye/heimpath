/**
 * Calculators Page
 * Financial calculators for property investment
 */

import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowUpDown,
  Calculator,
  Euro,
  Landmark,
  TrendingUp,
} from "lucide-react"
import {
  FinancingWizard,
  HiddenCostsCalculator,
  ROICalculator,
  StateComparison,
} from "@/components/Calculators"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/calculators")({
  component: CalculatorsPage,
  head: () => ({
    meta: [{ title: "Calculators - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Calculators page with tabs. */
function CalculatorsPage() {
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

      <Tabs defaultValue="costs">
        <TabsList>
          <TabsTrigger value="costs" className="gap-2">
            <Euro className="h-4 w-4" />
            Hidden Costs
          </TabsTrigger>
          <TabsTrigger value="roi" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            ROI Calculator
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            State Comparison
          </TabsTrigger>
          <TabsTrigger value="financing" className="gap-2">
            <Landmark className="h-4 w-4" />
            Financing
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
      </Tabs>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default CalculatorsPage
