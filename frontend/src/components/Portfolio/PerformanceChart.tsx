/**
 * Portfolio Performance Chart
 * 12-month line chart showing income, expenses, and net cash flow.
 * Shows ghost/placeholder state with sample data when no transactions exist.
 */

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import Colors from "@/common/styles/Colors"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useIsMobile } from "@/hooks/useMobile"
import type { PortfolioPerformance } from "@/models/portfolio"

interface IProps {
  performance: PortfolioPerformance
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const SHORT_MONTH = new Intl.DateTimeFormat("en", { month: "short" })

const SAMPLE_DATA = [
  { label: "Jan", income: 2400, expenses: 1800, netCashFlow: 600 },
  { label: "Feb", income: 2400, expenses: 1600, netCashFlow: 800 },
  { label: "Mar", income: 2400, expenses: 2100, netCashFlow: 300 },
  { label: "Apr", income: 2400, expenses: 1700, netCashFlow: 700 },
  { label: "May", income: 3600, expenses: 1900, netCashFlow: 1700 },
  { label: "Jun", income: 3600, expenses: 2200, netCashFlow: 1400 },
  { label: "Jul", income: 3600, expenses: 1800, netCashFlow: 1800 },
  { label: "Aug", income: 3600, expenses: 2500, netCashFlow: 1100 },
  { label: "Sep", income: 3600, expenses: 1700, netCashFlow: 1900 },
  { label: "Oct", income: 4800, expenses: 2000, netCashFlow: 2800 },
  { label: "Nov", income: 4800, expenses: 2300, netCashFlow: 2500 },
  { label: "Dec", income: 4800, expenses: 2100, netCashFlow: 2700 },
]

/******************************************************************************
                              Functions
******************************************************************************/

function formatYAxisTick(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

function formatMonthLabel(month: string): string {
  return SHORT_MONTH.format(new Date(`${month}-01`))
}

/******************************************************************************
                              Components
******************************************************************************/

/** Legend row above the chart. */
function ChartLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: Colors.Chart.Green }}
        />
        Income
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: Colors.Chart.Amber }}
        />
        Expenses
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: Colors.Chart.Blue }}
        />
        Net Cash Flow
      </span>
    </div>
  )
}

/** Ghost overlay shown when there is no transaction data. */
function GhostOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[2px]">
      <div className="text-center">
        <p className="text-sm font-medium">No transaction data yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add properties and record transactions to see your portfolio
          performance
        </p>
      </div>
    </div>
  )
}

/** Default component. 12-month performance area chart with ghost state. */
function PerformanceChart(props: Readonly<IProps>) {
  const { performance } = props
  const isMobile = useIsMobile()

  const chartData = useMemo(() => {
    if (!performance.hasData) return SAMPLE_DATA
    return performance.months.map((m) => ({
      label: formatMonthLabel(m.month),
      income: m.income,
      expenses: m.expenses,
      netCashFlow: m.netCashFlow,
    }))
  }, [performance])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          Performance (12 months)
        </CardTitle>
        <ChartLegend />
      </CardHeader>
      <CardContent>
        <div className="relative">
          {!performance.hasData && <GhostOverlay />}
          <div className={!performance.hasData ? "opacity-40" : undefined}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatYAxisTick}
                  hide={isMobile}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      income: "Income",
                      expenses: "Expenses",
                      netCashFlow: "Net Cash Flow",
                    }
                    return [
                      CURRENCY.format(Number(value)),
                      labels[String(name)] ?? name,
                    ]
                  }}
                  labelFormatter={String}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="income"
                  stroke={Colors.Chart.Green}
                  fill={Colors.Chart.Green}
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="expenses"
                  stroke={Colors.Chart.Amber}
                  fill={Colors.Chart.Amber}
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="netCashFlow"
                  name="netCashFlow"
                  stroke={Colors.Chart.Blue}
                  fill={Colors.Chart.Blue}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PerformanceChart }
export default PerformanceChart
