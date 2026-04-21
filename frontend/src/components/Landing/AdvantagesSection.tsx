import { Globe, LayoutDashboard, ShieldCheck, TrendingUp } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

/******************************************************************************
                              Constants
******************************************************************************/

const ADVANTAGES = [
  {
    icon: Globe,
    title: "Built for International Buyers",
    description:
      "Designed specifically for non-German speakers. Every legal term, process step, and document is presented in clear English with cultural context.",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  },
  {
    icon: ShieldCheck,
    title: "Risk-Aware Guidance",
    description:
      "Legal terms are automatically flagged with risk warnings. Document translations include confidence scores so you know what needs professional review.",
    color:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  },
  {
    icon: TrendingUp,
    title: "Complete Cost Transparency",
    description:
      "No hidden fees or surprise costs. Our calculators break down every expense — from property transfer tax to notary fees — so you know exactly what you'll pay.",
    color:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  },
  {
    icon: LayoutDashboard,
    title: "Post-Purchase Support",
    description:
      "Your journey doesn't end at closing. Track property performance, manage rental income, monitor running costs, and grow your portfolio with ongoing tools.",
    color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Advantages grid section. */
function AdvantagesSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Why HeimPath?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built from the ground up for people buying property in a country
            that isn't their own.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {ADVANTAGES.map((advantage) => (
            <Card
              key={advantage.title}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${advantage.color}`}
                >
                  <advantage.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{advantage.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {advantage.description}
                </p>
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

export { AdvantagesSection }
