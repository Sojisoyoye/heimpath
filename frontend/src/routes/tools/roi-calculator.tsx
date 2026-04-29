import { createFileRoute } from "@tanstack/react-router"

import { PropertyEvaluationCalculator } from "@/components/Calculators"
import { ToolsPageLayout } from "@/components/Tools/ToolsPageLayout"
import { toolsMeta } from "@/components/Tools/toolsMeta"

export const Route = createFileRoute("/tools/roi-calculator")({
  component: ROICalculatorPage,
  head: () => ({
    meta: toolsMeta(
      "German Rental Property ROI Calculator - HeimPath",
      "Analyse rental investment returns in Germany. Calculate gross yield, cap rate, cash-on-cash return, and view 10-year projections with German tax impact.",
      "/tools/roi-calculator",
    ),
  }),
})

function ROICalculatorPage() {
  return (
    <ToolsPageLayout
      title="German Rental Property ROI Calculator"
      description="Evaluate your rental property investment in Germany. Get an investment grade, see after-tax cash flow, and view 10-year return projections including depreciation benefits."
    >
      <PropertyEvaluationCalculator />
    </ToolsPageLayout>
  )
}
