import { createFileRoute } from "@tanstack/react-router"
import { RentVsBuyCalculator } from "@/components/Calculators/RentVsBuy"
import { ToolsPageLayout } from "@/components/Tools/ToolsPageLayout"
import { toolsMeta } from "@/components/Tools/toolsMeta"

export const Route = createFileRoute("/tools/rent-vs-buy-calculator")({
  component: RentVsBuyCalculatorPage,
  head: () => ({
    ...toolsMeta(
      "Rent vs. Buy Calculator Germany - HeimPath",
      "Compare the true long-term cost of renting versus buying property in Germany. Accounts for Grunderwerbsteuer, closing costs, mortgage payments, equity, and investment opportunity cost.",
      "/tools/rent-vs-buy-calculator",
    ),
  }),
})

function RentVsBuyCalculatorPage() {
  return (
    <ToolsPageLayout
      title="Rent vs. Buy Calculator"
      description="Is it cheaper to buy or rent in Germany? Compare the net long-term cost of both options, including closing costs, mortgage payments, equity growth, and what you could earn by investing your down payment instead."
    >
      <RentVsBuyCalculator />
    </ToolsPageLayout>
  )
}
