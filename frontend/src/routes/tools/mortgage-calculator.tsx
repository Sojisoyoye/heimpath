import { createFileRoute } from "@tanstack/react-router"

import { MortgageAmortisation } from "@/components/Calculators"
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

export const Route = createFileRoute("/tools/mortgage-calculator")({
  component: MortgageCalculatorPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    propertyPrice?: number
    downPaymentPercent?: number
    interestRate?: number
    initialRepaymentRate?: number
    fixedRatePeriod?: number
  } => ({
    propertyPrice: parseSearchNumber(search.propertyPrice),
    downPaymentPercent: parseSearchNumber(search.downPaymentPercent),
    interestRate: parseSearchNumber(search.interestRate),
    initialRepaymentRate: parseSearchNumber(search.initialRepaymentRate),
    fixedRatePeriod: parseSearchNumber(search.fixedRatePeriod),
  }),
  head: () => ({
    ...toolsMeta(
      "German Mortgage Calculator with Amortisation Schedule - HeimPath",
      "Calculate monthly mortgage payments for German property. View a full amortisation schedule and compare interest rates side by side.",
      "/tools/mortgage-calculator",
    ),
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

function MortgageCalculatorPage() {
  const initialValues = Route.useSearch()

  return (
    <ToolsPageLayout
      title="German Mortgage Calculator"
      description="Calculate your monthly mortgage payments, view a full amortisation schedule, and compare different interest rates for property financing in Germany."
    >
      <MortgageAmortisation initialValues={initialValues} />
    </ToolsPageLayout>
  )
}
