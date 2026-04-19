import { createFileRoute } from "@tanstack/react-router"

import { HiddenCostsCalculator } from "@/components/Calculators"
import { ToolsPageLayout } from "@/components/Tools/ToolsPageLayout"
import { toolsMeta } from "@/components/Tools/toolsMeta"

export const Route = createFileRoute("/tools/property-cost-calculator")({
  component: PropertyCostCalculatorPage,
  head: () => ({
    meta: toolsMeta(
      "German Property Purchase Cost Calculator - HeimPath",
      "Calculate the total cost of buying property in Germany. Includes transfer tax, notary fees, land registry, agent commission, and renovation estimates by state.",
    ),
  }),
})

function PropertyCostCalculatorPage() {
  return (
    <ToolsPageLayout
      title="German Property Purchase Cost Calculator"
      description="Find out the true cost of buying property in Germany. Transfer tax rates vary by state — our calculator covers all 16 Bundesländer plus notary fees, land registry, and agent commission."
    >
      <HiddenCostsCalculator />
    </ToolsPageLayout>
  )
}
