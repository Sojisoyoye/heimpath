/**
 * KPI Summary Bar Component
 * Displays 4 key metrics as cards at the top of the portfolio page
 */

import { Building2, DollarSign, Home, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PortfolioSummary } from "@/models/portfolio"

interface IProps {
  summary: PortfolioSummary
}

/******************************************************************************
                              Constants
******************************************************************************/

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)

const formatPercent = (value: number) => `${value.toFixed(1)}%`

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Reusable 4-card KPI row. */
function KpiSummaryBar(props: IProps) {
  const { summary } = props

  const cards = [
    {
      title: "Properties",
      value: String(summary.totalProperties),
      icon: Building2,
    },
    {
      title: "Net Cash Flow",
      value: formatCurrency(summary.netCashFlow),
      icon: DollarSign,
      valueClassName:
        summary.netCashFlow >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
    },
    {
      title: "Vacancy Rate",
      value: formatPercent(summary.vacancyRate),
      icon: Home,
    },
    {
      title: "Avg. Gross Yield",
      value: formatPercent(summary.averageGrossYield),
      icon: TrendingUp,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.valueClassName ?? ""}`}>
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
