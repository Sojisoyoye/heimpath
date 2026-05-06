/**
 * KPI Summary Bar Component
 * Displays 4 key metrics as cards at the top of the portfolio page
 */

import { Building2, DollarSign, Home, TrendingUp } from "lucide-react"
import { cn, formatEur } from "@/common/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PortfolioSummary } from "@/models/portfolio"

interface IProps {
  summary: PortfolioSummary
}

/******************************************************************************
                              Constants
******************************************************************************/

const formatPercent = (value: number) => `${value.toFixed(1)}%`

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Reusable 4-card KPI row. */
function KpiSummaryBar(props: Readonly<IProps>) {
  const { summary } = props

  const cards = [
    {
      title: "Properties",
      value: String(summary.totalProperties),
      icon: Building2,
      iconColor: "text-blue-600 dark:text-blue-400",
      accent: "border-l-blue-500",
    },
    {
      title: "Net Cash Flow",
      value: formatEur(summary.netCashFlow),
      icon: DollarSign,
      iconColor:
        summary.netCashFlow >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
      accent:
        summary.netCashFlow >= 0 ? "border-l-emerald-500" : "border-l-red-500",
      valueClassName:
        summary.netCashFlow >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
    },
    {
      title: "Vacancy Rate",
      value: formatPercent(summary.vacancyRate),
      icon: Home,
      iconColor: "text-amber-600 dark:text-amber-400",
      accent: "border-l-amber-500",
    },
    {
      title: "Avg. Gross Yield",
      value: formatPercent(summary.averageGrossYield),
      icon: TrendingUp,
      iconColor: "text-teal-600 dark:text-teal-400",
      accent: "border-l-teal-500",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={cn("border-l-4", card.accent)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={cn("h-4 w-4", card.iconColor)} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", card.valueClassName)}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { KpiSummaryBar }
export default KpiSummaryBar
