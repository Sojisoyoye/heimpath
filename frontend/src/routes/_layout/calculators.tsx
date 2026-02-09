/**
 * Calculators Page
 * Financial calculators for property investment
 */

import { createFileRoute } from "@tanstack/react-router"
import { Calculator, Euro, TrendingUp } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HiddenCostsCalculator, ROICalculator } from "@/components/Calculators"

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
        </TabsList>

        <TabsContent value="costs" className="mt-6">
          <HiddenCostsCalculator />
        </TabsContent>

        <TabsContent value="roi" className="mt-6">
          <ROICalculator />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default CalculatorsPage
