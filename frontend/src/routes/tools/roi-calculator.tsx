import { createFileRoute } from "@tanstack/react-router"

import { PropertyEvaluationCalculator } from "@/components/Calculators"
import { ToolsPageLayout } from "@/components/Tools/ToolsPageLayout"
import { toolsMeta } from "@/components/Tools/toolsMeta"

/******************************************************************************
                              Functions
******************************************************************************/

function parseSearchNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseFloat(value) || undefined
  return undefined
}

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/tools/roi-calculator")({
  component: ROICalculatorPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    purchasePrice?: number
    state?: string
    squareMeters?: number
    monthlyRent?: number
  } => ({
    purchasePrice: parseSearchNumber(search.purchasePrice),
    state: typeof search.state === "string" ? search.state : undefined,
    squareMeters: parseSearchNumber(search.squareMeters),
    monthlyRent: parseSearchNumber(search.monthlyRent),
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
  const { purchasePrice, state, squareMeters, monthlyRent } = Route.useSearch()

  return (
    <ToolsPageLayout
      title="German Rental Property ROI Calculator"
      description="Evaluate your rental property investment in Germany. Calculate gross yield, cashflow after tax, investment grade score, AfA depreciation benefit, and view 10-year equity and cashflow projections."
    >
      <PropertyEvaluationCalculator
        initialPurchasePrice={purchasePrice}
        initialState={state}
        initialSquareMeters={squareMeters}
        initialMonthlyRent={monthlyRent}
      />
    </ToolsPageLayout>
  )
}
