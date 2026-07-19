import { createFileRoute } from "@tanstack/react-router"

import { PropertyEvaluationCalculator } from "@/components/Calculators"
import { ToolsPageLayout } from "@/components/Tools/ToolsPageLayout"
import { toolsMeta } from "@/components/Tools/toolsMeta"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/tools/roi-calculator")({
  component: ROICalculatorPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { purchasePrice?: number; state?: string } => ({
    purchasePrice:
      typeof search.purchasePrice === "number"
        ? search.purchasePrice
        : typeof search.purchasePrice === "string"
          ? Number.parseFloat(search.purchasePrice) || undefined
          : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
  }),
  head: () => ({
    ...toolsMeta(
      "German Rental Property ROI Calculator - HeimPath",
      "Analyse rental investment returns in Germany. Calculate gross yield, cap rate, cash-on-cash return, and view 10-year projections with German tax impact.",
      "/tools/roi-calculator",
    ),
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

function ROICalculatorPage() {
  const { purchasePrice, state } = Route.useSearch()

  return (
    <ToolsPageLayout
      title="German Rental Property ROI Calculator"
      description="Evaluate your rental property investment in Germany. Calculate gross yield, cashflow after tax, investment grade score, AfA depreciation benefit, and view 10-year equity and cashflow projections."
    >
      <PropertyEvaluationCalculator
        initialPurchasePrice={purchasePrice}
        initialState={state}
      />
    </ToolsPageLayout>
  )
}
