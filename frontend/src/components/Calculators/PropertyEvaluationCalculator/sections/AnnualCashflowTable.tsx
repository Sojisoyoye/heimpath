/**
 * Annual Cashflow Table
 * Area chart + collapsible table showing year-by-year cashflow projection
 */

import { ChevronDown, ChevronUp } from "lucide-react"
import { useMemo, useState } from "react"
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
import { cn } from "@/common/utils"
import { EUR_FORMATTER_0 as EUR_FORMATTER } from "@/common/utils/formatters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnnualCashflowRow } from "../types"

interface IProps {
  rows: AnnualCashflowRow[]
  className?: string
}

/******************************************************************************
                              Functions
******************************************************************************/

function formatYAxisTick(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Annual cashflow projection table with area chart. */
function AnnualCashflowTable(props: IProps) {
  const { rows, className } = props
  const [tableOpen, setTableOpen] = useState(false)

  const chartData = useMemo(() => {
    let cumCf = 0
    return rows.map((r) => {
      cumCf += r.netCfAfterTax
      return {
        name: `Yr ${r.year}`,
        propertyValue: Math.round(r.propertyValue),
        equity: Math.round(r.equityBuildupAccumulated),
        cumulativeCf: Math.round(cumCf),
      }
    })
  }, [rows])

  if (rows.length === 0) return null

  const exitIndex = rows.length - 1

  const totalColdRent = rows.reduce((sum, r) => sum + r.coldRent, 0)
  const totalInterest = rows.reduce((sum, r) => sum + r.interest, 0)
  const totalRepayment = rows.reduce((sum, r) => sum + r.repayment, 0)
  const totalNetCfAfterTax = rows.reduce((sum, r) => sum + r.netCfAfterTax, 0)

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Annual Cashflow Projection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        {/* Area Chart */}
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: Colors.Chart.Blue }}
              />
              Property Value
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: Colors.Chart.Green }}
              />
              Equity Buildup
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: Colors.Chart.Amber }}
              />
              Cumulative Cashflow
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={formatYAxisTick}
                width={48}
              />
              <Tooltip
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    propertyValue: "Property Value",
                    equity: "Equity Buildup",
                    cumulativeCf: "Cumulative Cashflow",
                  }
                  return [
                    EUR_FORMATTER.format(Number(value)),
                    labels[String(name)] ?? String(name),
                  ]
                }}
                labelFormatter={String}
              />
              <Area
                type="monotone"
                dataKey="propertyValue"
                stroke={Colors.Chart.Blue}
                fill={Colors.Chart.Blue}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={Colors.Chart.Green}
                fill={Colors.Chart.Green}
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cumulativeCf"
                stroke={Colors.Chart.Amber}
                fill={Colors.Chart.Amber}
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Collapsible table toggle */}
        <button
          type="button"
          onClick={() => setTableOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <span>Year-by-Year Detail</span>
          {tableOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {tableOpen && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                    Year
                  </th>
                  <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    Cold Rent
                  </th>
                  <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    Interest
                  </th>
                  <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    Repayment
                  </th>
                  <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    Net CF Post-Tax
                  </th>
                  <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    Property Value
                  </th>
                  <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    Equity Buildup
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isExit = i === exitIndex
                  return (
                    <tr
                      key={row.year}
                      className={cn(
                        "border-b",
                        isExit &&
                          "bg-blue-50 font-semibold dark:bg-blue-950/30",
                        !isExit && i % 2 === 1 && "bg-muted/30",
                      )}
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {row.year}
                        {isExit && (
                          <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">
                            (exit)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        {EUR_FORMATTER.format(row.coldRent)}
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        {EUR_FORMATTER.format(row.interest)}
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        {EUR_FORMATTER.format(row.repayment)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-1.5 text-right whitespace-nowrap",
                          row.netCfAfterTax >= 0
                            ? "text-green-600"
                            : "text-red-600",
                        )}
                      >
                        {EUR_FORMATTER.format(row.netCfAfterTax)}
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        {EUR_FORMATTER.format(row.propertyValue)}
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        {EUR_FORMATTER.format(row.equityBuildupAccumulated)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/50 font-semibold">
                  <td className="px-3 py-2 whitespace-nowrap">Total</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {EUR_FORMATTER.format(totalColdRent)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {EUR_FORMATTER.format(totalInterest)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {EUR_FORMATTER.format(totalRepayment)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right whitespace-nowrap",
                      totalNetCfAfterTax >= 0
                        ? "text-green-600"
                        : "text-red-600",
                    )}
                  >
                    {EUR_FORMATTER.format(totalNetCfAfterTax)}
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { AnnualCashflowTable }
