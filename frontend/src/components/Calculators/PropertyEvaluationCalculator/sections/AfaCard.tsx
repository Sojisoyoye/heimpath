/**
 * AfA Card — Depreciation (§7 EStG) breakdown
 * Collapsible card showing annual AfA deduction and 10-year tax saving chart
 */

import { ChevronDown, ChevronUp, TrendingDown } from "lucide-react"
import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import Colors from "@/common/styles/Colors"
import { EUR_FORMATTER_0 as EUR_FORMATTER } from "@/common/utils/formatters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AnnualCashflowRow } from "../types"

interface IProps {
  purchasePrice: number
  buildingSharePercent: number
  depreciationRatePercent: number
  marginalTaxRatePercent: number
  annualRows: AnnualCashflowRow[]
}

/******************************************************************************
                              Functions
******************************************************************************/

/**
 * Return the standard §7 Abs. 4 EStG AfA rate.
 * Note: the 3% rate applies to buildings completed (Fertigstellung) from
 * 1 January 2023 (JStG 2022), not simply built in 2023+.
 * Use the completion year when evaluating new-builds.
 */
function getAfaRate(year: number): number {
  if (year < 1925) return 2.5
  if (year >= 2023) return 3.0
  return 2.0
}

function formatYAxisTick(v: number): string {
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Collapsible AfA depreciation breakdown card. */
function AfaCard(props: Readonly<IProps>) {
  const {
    purchasePrice,
    buildingSharePercent,
    depreciationRatePercent,
    marginalTaxRatePercent,
    annualRows,
  } = props

  const [isOpen, setIsOpen] = useState(false)
  const [completionYear, setCompletionYear] = useState("")

  const buildingValue = purchasePrice * (buildingSharePercent / 100)
  const annualAfa = buildingValue * (depreciationRatePercent / 100)
  const afaTaxSaving = annualAfa * (marginalTaxRatePercent / 100)

  const suggestedRate =
    completionYear && Number(completionYear) >= 1800
      ? getAfaRate(Number(completionYear))
      : null

  const chartData = useMemo(
    () =>
      annualRows.map((r) => ({
        name: `Yr ${r.year}`,
        taxSaving: Math.round(r.actualTaxSaving),
      })),
    [annualRows],
  )

  const totalTaxSaving = annualRows.reduce((s, r) => s + r.actualTaxSaving, 0)

  function handleToggle() {
    setIsOpen((o) => !o)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3">
        <button
          type="button"
          className="flex w-full cursor-pointer select-none items-center gap-2 text-base font-semibold"
          onClick={handleToggle}
          aria-expanded={isOpen}
        >
          <TrendingDown className="h-4 w-4" />
          <CardTitle className="text-base">Depreciation (AfA)</CardTitle>
          <span className="ml-auto">
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4 pt-0">
          {/* Completion year helper */}
          <div className="space-y-1">
            <Label
              htmlFor="afa-completion-year"
              className="text-xs text-muted-foreground"
            >
              Completion year / Baujahr (optional — suggests standard AfA rate)
            </Label>
            <Input
              id="afa-completion-year"
              type="number"
              min="1800"
              max="2030"
              placeholder="e.g. 1990"
              value={completionYear}
              onChange={(e) => setCompletionYear(e.target.value)}
              className="h-8 text-sm"
            />
            {suggestedRate !== null && (
              <p className="text-xs text-muted-foreground">
                Standard rate for {completionYear}:{" "}
                <span className="font-medium">{suggestedRate}%</span>
                {suggestedRate !== depreciationRatePercent && (
                  <span className="ml-1">
                    (you have set {depreciationRatePercent}% in Rent section)
                  </span>
                )}
                {Number(completionYear) >= 2023 && (
                  <span className="ml-1 text-amber-600">
                    — 3% applies to new-builds completed from 1 Jan 2023 (§7
                    Abs. 4 EStG, JStG 2022)
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Building Value</p>
              <p className="font-semibold">
                {EUR_FORMATTER.format(buildingValue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {buildingSharePercent}% of purchase price
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Annual AfA</p>
              <p className="font-semibold">{EUR_FORMATTER.format(annualAfa)}</p>
              <p className="text-xs text-muted-foreground">
                {depreciationRatePercent}% × building value
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Tax Saving / yr</p>
              <p className="font-semibold text-green-600">
                {EUR_FORMATTER.format(afaTaxSaving)}
              </p>
              <p className="text-xs text-muted-foreground">
                at {marginalTaxRatePercent}% marginal rate
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Total Tax Saving ({annualRows.length} yr)
              </p>
              <p className="font-semibold text-green-600">
                {EUR_FORMATTER.format(totalTaxSaving)}
              </p>
            </div>
          </div>

          {/* Bar chart — annual tax saving */}
          {chartData.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Annual Tax Saving (EUR)
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={formatYAxisTick}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        taxSaving: "Tax Saving",
                      }
                      return [
                        EUR_FORMATTER.format(Number(value)),
                        labels[String(name)] ?? String(name),
                      ]
                    }}
                    labelFormatter={String}
                  />
                  <Bar
                    dataKey="taxSaving"
                    fill={Colors.Chart.Green}
                    fillOpacity={0.8}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { AfaCard }
