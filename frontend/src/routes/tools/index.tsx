import { createFileRoute, Link } from "@tanstack/react-router"
import { Calculator, Home, TrendingUp } from "lucide-react"

import { toolsMeta } from "@/components/Tools/toolsMeta"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/tools/")({
  component: ToolsIndexPage,
  head: () => ({
    meta: toolsMeta(
      "Free German Property Calculators - HeimPath",
      "Free calculators for buying property in Germany. Estimate hidden costs, mortgage payments, and rental ROI — no sign-up required.",
    ),
  }),
})

/******************************************************************************
                              Constants
******************************************************************************/

const TOOLS = [
  {
    title: "Property Cost Calculator",
    description:
      "Estimate the true cost of buying property in Germany — transfer tax, notary fees, agent commission, and more.",
    href: "/tools/property-cost-calculator",
    icon: Calculator,
  },
  {
    title: "Mortgage Calculator",
    description:
      "Calculate monthly payments, view an amortisation schedule, and compare interest rates for German mortgages.",
    href: "/tools/mortgage-calculator",
    icon: Home,
  },
  {
    title: "ROI Calculator",
    description:
      "Analyse rental investment returns, get an investment grade, and see 10-year projections with tax impact.",
    href: "/tools/roi-calculator",
    icon: TrendingUp,
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

function ToolsIndexPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Free German Property Calculators
        </h1>
        <p className="text-lg text-muted-foreground">
          Plan your property purchase in Germany with our free tools — no
          sign-up required.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link key={tool.href} to={tool.href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <tool.icon className="mb-2 h-8 w-8 text-primary" />
                <CardTitle className="text-lg">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
