/**
 * Mortgage Amortisation Chart
 * Stacked area chart showing principal vs interest over time
 */

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import Colors from "@/common/styles/Colors"
import type { MortgageResult } from "@/models/mortgageAmortisation"

interface IProps {
  result: MortgageResult
  fixedRatePeriod: number
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

/******************************************************************************
                              Functions
******************************************************************************/

function formatYAxisTick(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

/******************************************************************************
                              Components
******************************************************************************/

function MortgageAmortisationChart(props: Readonly<IProps>) {
  const { result, fixedRatePeriod } = props

  const chartData = useMemo(
    () =>
      result.schedule.map((row) => ({
        name: `Yr ${row.year}`,
        year: row.year,
        interest: Math.round(row.interestPortion),
        principal: Math.round(row.principalPortion + row.specialRepayment),
      })),
    [result.schedule],
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />{" "}
          Interest
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />{" "}
          Principal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 border-2 border-dashed border-muted-foreground rounded-full" />{" "}
          Zinsbindung ends
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatYAxisTick} />
          <Tooltip
            formatter={(value, name) => {
              const label = name === "interest" ? "Interest" : "Principal"
              return [CURRENCY.format(Number(value)), label]
            }}
            labelFormatter={String}
          />
          <ReferenceLine
            x={`Yr ${fixedRatePeriod}`}
            stroke={Colors.Text.Muted}
            strokeDasharray="6 4"
            label={{
              value: "Zinsbindung ends",
              position: "top",
              fontSize: 11,
              fill: Colors.Text.Muted,
            }}
          />
          <Area
            type="monotone"
            dataKey="interest"
            name="interest"
            stackId="1"
            stroke={Colors.Chart.Amber}
            fill={Colors.Chart.Amber}
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="principal"
            name="principal"
            stackId="1"
            stroke={Colors.Chart.Blue}
            fill={Colors.Chart.Blue}
            fillOpacity={0.4}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MortgageAmortisationChart }
