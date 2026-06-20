import { Link } from "@tanstack/react-router"
import { Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AnimateIn } from "./AnimateIn"
import { LandingFooter } from "./LandingFooter"
import { LandingHeader } from "./LandingHeader"

/******************************************************************************
                              Constants
******************************************************************************/

const TIERS = [
  {
    id: "explorer",
    name: "Explorer",
    price: "Free",
    priceDetail: "always free",
    headline: "Do the rent-vs-buy math",
    description:
      "Free tools to understand the German property market before you commit.",
    cta: "Get Started Free",
    ctaTo: "/signup" as const,
    highlight: false,
    features: [
      "Rent vs. Buy Wealth Calculator",
      "Hidden Costs Calculator",
      "German property glossary (English)",
      "19 laws explained in plain English",
      "State-by-state tax comparison",
      "Free tools at tools.heimpath.com",
    ],
  },
  {
    id: "buyer",
    name: "Buyer",
    price: "€19",
    priceDetail: "/ month · billed monthly",
    yearlyPrice: "€149",
    yearlyDetail: "/ year · save 35%",
    headline: "Your full path to ownership",
    description:
      "Everything you need to go from first search to signed Kaufvertrag.",
    cta: "Get Started Free",
    ctaTo: "/signup" as const,
    highlight: true,
    badge: "Most Popular",
    features: [
      "Everything in Explorer",
      "Guided buying journey (5 phases, 13 steps)",
      "Document translation (Kaufvertrag + 4 types)",
      "Mortgage eligibility calculator",
      "Viewing checklist & property notes",
      "Bank account guide for foreigners",
      "Articles & market updates",
      "Email support within 24 h",
    ],
  },
  {
    id: "investor",
    name: "Investor",
    price: "€39",
    priceDetail: "/ month · billed monthly",
    yearlyPrice: "€299",
    yearlyDetail: "/ year · save 36%",
    headline: "Build and track your portfolio",
    description:
      "Multi-property management and ROI tracking for serious portfolio builders.",
    cta: "Get Started Free",
    ctaTo: "/signup" as const,
    highlight: false,
    features: [
      "Everything in Buyer",
      "Unlimited property journeys",
      "Portfolio dashboard (rental yield, running costs)",
      "ROI & AfA depreciation calculators",
      "Multi-property performance trends",
      "Priority support (response within 4 h)",
      "Early access to new features",
    ],
  },
] as const

const BETA_NOTE =
  "Beta pricing — locked for life for early members. Rates increase when we exit beta."

/******************************************************************************
                              Components
******************************************************************************/

interface ITierCardProps {
  tier: (typeof TIERS)[number]
}

function TierCard({ tier }: ITierCardProps) {
  return (
    <Card
      className={`relative flex flex-col ${
        tier.highlight
          ? "border-blue-600 shadow-lg ring-1 ring-blue-600"
          : "border"
      }`}
    >
      {tier.highlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-blue-600 text-white px-3 py-0.5 text-xs font-semibold shadow">
            {"badge" in tier ? tier.badge : ""}
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4 pt-6">
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <CardDescription>{tier.description}</CardDescription>

        <div className="mt-4">
          <span className="text-4xl font-bold">{tier.price}</span>
          <span className="ml-1 text-sm text-muted-foreground">
            {tier.priceDetail}
          </span>
          {"yearlyPrice" in tier && (
            <p className="mt-1 text-xs text-muted-foreground">
              or{" "}
              <span className="font-medium text-foreground">
                {tier.yearlyPrice}
              </span>{" "}
              {tier.yearlyDetail}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="mb-4 text-sm font-semibold">{tier.headline}</p>
        <ul className="space-y-2.5">
          {tier.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          size="lg"
          className="w-full"
          variant={tier.highlight ? "default" : "outline"}
          asChild
        >
          <Link to={tier.ctaTo}>{tier.cta}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

/** Default component. Full pricing page with 3-tier table. */
function PricingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-20 dark:from-blue-950/30 dark:to-purple-950/30 md:py-28">
          <AnimateIn>
            <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
              <Badge variant="secondary" className="mb-4">
                Beta pricing — locked for early members
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                The cheapest owner is the{" "}
                <span className="text-blue-600">expat who did the math</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                HeimPath costs less per month than one hour with a German
                notary. Unlock the English-language tools, guided journey, and
                legal clarity to buy with confidence.
              </p>
            </div>
          </AnimateIn>
        </section>

        {/* Pricing tiers */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <AnimateIn>
              <div className="mb-8 text-center text-sm text-muted-foreground">
                {BETA_NOTE}
              </div>
            </AnimateIn>

            <div className="grid gap-8 md:grid-cols-3">
              {TIERS.map((tier, i) => (
                <AnimateIn key={tier.id} delayMs={i * 100}>
                  <TierCard tier={tier} />
                </AnimateIn>
              ))}
            </div>

            <AnimateIn>
              <p className="mt-8 text-center text-xs text-muted-foreground">
                Sign up free — no credit card required. Upgrade when you're
                ready. Cancel anytime.
              </p>
            </AnimateIn>
          </div>
        </section>

        {/* FAQ row */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <AnimateIn>
              <h2 className="mb-10 text-center text-2xl font-bold">
                Common questions
              </h2>
            </AnimateIn>
            <AnimateIn>
              <dl className="space-y-6 text-sm">
                <div>
                  <dt className="font-semibold">
                    Do I need to be in Germany to use HeimPath?
                  </dt>
                  <dd className="mt-1 text-muted-foreground">
                    No. Most users start researching from abroad. The Explorer
                    plan is free and gives you all the tools to do the
                    rent-vs-buy maths before you relocate.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">
                    Can I switch plans at any time?
                  </dt>
                  <dd className="mt-1 text-muted-foreground">
                    Yes. Upgrade or downgrade at any time — changes take effect
                    immediately and are prorated.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">
                    What happens to my data if I cancel?
                  </dt>
                  <dd className="mt-1 text-muted-foreground">
                    Your journeys, documents, and calculations are retained for
                    30 days after cancellation. You can export everything before
                    that window closes.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">
                    Is beta pricing really locked in forever?
                  </dt>
                  <dd className="mt-1 text-muted-foreground">
                    Yes. Early members who sign up during the beta period keep
                    their rate as long as their subscription stays active — even
                    as we raise prices for new users.
                  </dd>
                </div>
              </dl>
            </AnimateIn>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PricingPage }
