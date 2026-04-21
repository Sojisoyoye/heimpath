import {
  Calculator,
  FileText,
  Home,
  LayoutDashboard,
  Scale,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

/******************************************************************************
                              Constants
******************************************************************************/

const FEATURES = [
  {
    icon: Home,
    title: "Guided Property Journeys",
    description:
      "Follow a step-by-step path from initial research through closing. Each phase is tailored to international buyers navigating German real estate for the first time.",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  },
  {
    icon: Scale,
    title: "Legal Knowledge Base",
    description:
      "Access 50+ German real estate laws and regulations explained in plain English. Understand your rights, obligations, and key legal milestones before you sign.",
    color:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  },
  {
    icon: Calculator,
    title: "Financial Calculators",
    description:
      "Calculate the true cost of buying property in Germany — including notary fees, property transfer tax, agent commissions, and other hidden costs.",
    color:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  },
  {
    icon: FileText,
    title: "Document Translation",
    description:
      "Upload German legal documents and get AI-powered translations with confidence scores. Financial and legal terms are flagged for manual review.",
    color:
      "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  },
  {
    icon: LayoutDashboard,
    title: "Portfolio Management",
    description:
      "Track your properties, monitor rental yields, manage running costs, and view performance trends — all in one place after your purchase.",
    color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Features grid section. */
function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything You Need — From Search to Portfolio
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Purpose-built tools for international buyers navigating the German
            real estate market and managing their investments.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="flex gap-4 p-6">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${feature.color}`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FeaturesSection }
