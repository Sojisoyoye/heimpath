/**
 * Calculators Section
 * Landing-page tabbed calculator widget (Mortgage / Purchase Cost /
 * Property Evaluation), each with dynamic left-column copy and a compact
 * preview. Mortgage and Purchase Cost link out to their full detailed
 * /tools page; Property Evaluation collects a couple of basics only and
 * redirects — its full result is gated behind sign-up on that page.
 */

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnimateIn } from "../AnimateIn"
import { MortgagePreview } from "./MortgagePreview"
import { PropertyEvaluationPreview } from "./PropertyEvaluationPreview"
import { PurchaseCostPreview } from "./PurchaseCostPreview"

/******************************************************************************
                              Types
******************************************************************************/

type CalculatorTab = "mortgage" | "purchase-cost" | "property-evaluation"

/******************************************************************************
                              Constants
******************************************************************************/

const TAB_COPY: Record<
  CalculatorTab,
  {
    headline: React.ReactNode
    sub: string
    learnMore: string
    href: string
  }
> = {
  mortgage: {
    headline: (
      <>
        Calculate your{" "}
        <span className="text-primary">monthly mortgage payment</span> before
        you sign anything.
      </>
    ),
    sub: "See a full amortisation schedule and compare interest rates side by side for property financing in Germany.",
    learnMore: "Try the full mortgage calculator",
    href: "/tools/mortgage-calculator",
  },
  "purchase-cost": {
    headline: (
      <>
        See your <span className="text-blue-600">true purchase cost</span>{" "}
        before you make an offer.
      </>
    ),
    sub: "Grunderwerbsteuer, notary, land registry, and agent commission — every hidden cost accounted for.",
    learnMore: "Try the full cost calculator",
    href: "/tools/property-cost-calculator",
  },
  "property-evaluation": {
    headline: (
      <>
        Evaluate a property <span className="text-primary">instantly</span>.
      </>
    ),
    sub: "Found a listing? Estimate your monthly costs, cashflow, and return on investment before you commit. Our Property Evaluation Calculator gives you a clear picture in minutes.",
    learnMore: "Fill in a few details to get started",
    href: "/tools/roi-calculator",
  },
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Tabbed calculator section with dynamic left-column copy. */
function CalculatorsSection() {
  const [tab, setTab] = useState<CalculatorTab>("mortgage")
  const copy = TAB_COPY[tab]

  return (
    <section id="calculators" className="border-y bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimateIn>
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Free · No sign-up required
          </span>
        </AnimateIn>

        <div className="mt-6 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <AnimateIn>
            <h2 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
              {copy.headline}
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">{copy.sub}</p>
            <Link
              to={copy.href}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              {copy.learnMore}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </AnimateIn>

          <AnimateIn delayMs={100}>
            <Tabs value={tab} onValueChange={(v) => setTab(v as CalculatorTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="mortgage">Mortgage</TabsTrigger>
                <TabsTrigger value="purchase-cost">Purchase Cost</TabsTrigger>
                <TabsTrigger value="property-evaluation">
                  Property Evaluation
                </TabsTrigger>
              </TabsList>
              <div className="mt-4 min-h-[460px] rounded-xl border bg-card p-6">
                <TabsContent value="mortgage" className="mt-0">
                  <MortgagePreview />
                </TabsContent>
                <TabsContent value="purchase-cost" className="mt-0">
                  <PurchaseCostPreview />
                </TabsContent>
                <TabsContent value="property-evaluation" className="mt-0">
                  <PropertyEvaluationPreview />
                </TabsContent>
              </div>
            </Tabs>
          </AnimateIn>
        </div>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { CalculatorsSection }
