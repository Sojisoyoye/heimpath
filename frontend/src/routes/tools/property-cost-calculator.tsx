import { createFileRoute } from "@tanstack/react-router"

import { HiddenCostsCalculator } from "@/components/Calculators"
import { ToolsPageLayout } from "@/components/Tools/ToolsPageLayout"
import { toolsMeta } from "@/components/Tools/toolsMeta"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/tools/property-cost-calculator")({
  component: PropertyCostCalculatorPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    propertyPrice?: number
    state?: string
    propertyType?: string
    includeAgent?: boolean
  } => ({
    propertyPrice:
      typeof search.propertyPrice === "number"
        ? search.propertyPrice
        : typeof search.propertyPrice === "string"
          ? Number.parseFloat(search.propertyPrice) || undefined
          : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    propertyType:
      typeof search.propertyType === "string" ? search.propertyType : undefined,
    includeAgent:
      typeof search.includeAgent === "boolean"
        ? search.includeAgent
        : undefined,
  }),
  head: () => ({
    ...toolsMeta(
      "German Property Purchase Cost Calculator - HeimPath",
      "Calculate the total cost of buying property in Germany. Includes transfer tax, notary fees, land registry, agent commission, and renovation estimates by state.",
      "/tools/property-cost-calculator",
    ),
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

function PropertyCostCalculatorPage() {
  const initialValues = Route.useSearch()

  return (
    <ToolsPageLayout
      title="German Property Purchase Cost Calculator"
      description="Find out the true cost of buying property in Germany. Transfer tax rates vary by state — our calculator covers all 16 Bundesländer plus notary fees, land registry, and agent commission."
    >
      <HiddenCostsCalculator initialValues={initialValues} />
    </ToolsPageLayout>
  )
}
