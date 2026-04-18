/**
 * Ownership Comparison Chart
 * Dual-line area chart comparing private vs GmbH cumulative income
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
import type { OwnershipComparisonResult } from "@/models/ownershipComparison"

interface IProps {
  results: OwnershipComparisonResult
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

function OwnershipComparisonChart(props: Readonly<IProps>) {
  const { results } = props

  const chartData = useMemo(
    () =>
      results.private.projections.map((p, i) => ({
        name: `Yr ${p.year}`,
        private: Math.round(p.cumulativeNetIncome),
        gmbh: Math.round(results.gmbh.projections[i].cumulativeNetIncome),
      })),
    [results],
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />{" "}
          Private
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-500" />{" "}
          GmbH
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
              const label = name === "private" ? "Private" : "GmbH"
              return [CURRENCY.format(Number(value)), label]
            }}
            labelFormatter={String}
          />
          <Area
            type="monotone"
            dataKey="private"
            name="private"
            stroke={Colors.Chart.Blue}
            fill={Colors.Chart.Blue}
            fillOpacity={0.1}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="gmbh"
            name="gmbh"
            stroke={Colors.Chart.Purple}
            fill={Colors.Chart.Purple}
            fillOpacity={0.1}
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

export { OwnershipComparisonChart }
