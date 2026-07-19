import { Link } from "@tanstack/react-router"
import {
  Calculator,
  FileText,
  Home,
  LayoutDashboard,
  Scale,
  TrendingUp,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

import { AnimateIn } from "./AnimateIn"

/******************************************************************************
                              Constants
******************************************************************************/

const FEATURES = [
  {
    icon: Home,
    title: "Guided Property Journeys",
    description: "Step-by-step guidance from research through closing.",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  },
  {
    icon: Scale,
    title: "Legal Knowledge Base",
    description: "50+ German real estate laws in plain English.",
    color:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
    href: "/laws",
  },
  {
    icon: TrendingUp,
    title: "Rent vs. Buy Calculator",
    description: "See when buying beats renting in your market.",
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
  },
  {
    icon: Calculator,
    title: "Full Cost Calculators",
    description: "Every hidden cost of buying property in Germany.",
    color:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  },
  {
    icon: FileText,
    title: "Document Translation",
    description: "AI translations with confidence scores.",
    color:
      "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  },
  {
    icon: LayoutDashboard,
    title: "Portfolio Management",
    description: "Track yields, costs, and performance after purchase.",
    color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Features section — headline on the left, a 2-per-row card grid on the right. */
function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <AnimateIn>
            <h2 className="text-3xl font-extrabold tracking-tight text-balance md:text-4xl">
              Everything You Need — From Search to Portfolio
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Purpose-built tools for international buyers navigating the German
              real estate market and managing their investments.
            </p>
          </AnimateIn>

          <AnimateIn delayMs={100}>
            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map((feature, i) => {
                const href = "href" in feature ? feature.href : undefined
                const card = (
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feature.color}`}
                      >
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">
                          {feature.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )

                return (
                  <AnimateIn key={feature.title} delayMs={(i + 1) * 75}>
                    {href ? (
                      <Link to={href} className="block h-full">
                        {card}
                      </Link>
                    ) : (
                      card
                    )}
                  </AnimateIn>
                )
              })}
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FeaturesSection }
