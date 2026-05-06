import { Link } from "@tanstack/react-router"
import { ArrowRight, Calculator, Home, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { AnimateIn } from "./AnimateIn"

/******************************************************************************
                              Constants
******************************************************************************/

const FREE_TOOLS = [
  {
    icon: Calculator,
    title: "Property Cost Calculator",
    description:
      "Estimate Grunderwerbsteuer, notary fees, agent commission, and all closing costs before you make an offer.",
    href: "/tools/property-cost-calculator",
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400",
  },
  {
    icon: Home,
    title: "Mortgage Calculator",
    description:
      "See your monthly repayments, full amortisation schedule, and compare rates side by side.",
    href: "/tools/mortgage-calculator",
    color:
      "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  {
    icon: TrendingUp,
    title: "ROI Calculator",
    description:
      "Analyse rental yield, get an investment grade, and see 10-year cashflow projections with tax impact.",
    href: "/tools/roi-calculator",
    color:
      "text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400",
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Free tools section for the landing page — no sign-up required. */
function FreeToolsSection() {
  return (
    <section className="py-16 md:py-24" id="free-tools">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimateIn>
          <div className="mb-10 text-center md:mb-14">
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              No sign-up required
            </span>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Try Our Free Property Tools
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Get a clear financial picture before you commit — our calculators
              are free to use and built specifically for buying property in
              Germany.
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FREE_TOOLS.map((tool) => (
            <AnimateIn key={tool.href}>
              <Card className="flex h-full flex-col">
                <CardHeader className="flex-1">
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${tool.color}`}
                  >
                    <tool.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{tool.title}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full"
                  >
                    <Link to={tool.href}>
                      Try for free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </AnimateIn>
          ))}
        </div>

        <AnimateIn>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Want the full experience?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary hover:underline"
            >
              Create a free account
            </Link>{" "}
            to save results, track your journey, and unlock all features.
          </p>
        </AnimateIn>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FreeToolsSection }
