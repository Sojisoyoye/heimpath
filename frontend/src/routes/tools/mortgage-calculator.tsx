import { createFileRoute } from "@tanstack/react-router"

import { MortgageAmortisation } from "@/components/Calculators"
import { ToolsPageLayout } from "@/components/Tools/ToolsPageLayout"
import { toolsMeta } from "@/components/Tools/toolsMeta"

export const Route = createFileRoute("/tools/mortgage-calculator")({
  component: MortgageCalculatorPage,
  head: () => ({
    meta: toolsMeta(
      "German Mortgage Calculator with Amortisation Schedule - HeimPath",
      "Calculate monthly mortgage payments for German property. View a full amortisation schedule and compare interest rates side by side.",
      "/tools/mortgage-calculator",
    ),
  }),
})

function MortgageCalculatorPage() {
  return (
    <ToolsPageLayout
      title="German Mortgage Calculator"
      description="Calculate your monthly mortgage payments, view a full amortisation schedule, and compare different interest rates for property financing in Germany."
    >
      <MortgageAmortisation />
    </ToolsPageLayout>
  )
}
