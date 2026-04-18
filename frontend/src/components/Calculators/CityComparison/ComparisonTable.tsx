/**
 * Comparison Table Component
 * Displays side-by-side metrics for selected areas
 */

import { TrendingUp } from "lucide-react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { ComparisonMetrics } from "@/models/marketComparison"

interface IProps {
  data: ComparisonMetrics[]
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const RENT_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/******************************************************************************
                              Components
******************************************************************************/

/** Trend badge */
function TrendBadge(props: Readonly<{ trend: string | null }>) {
  if (!props.trend) return null
  const isRising = props.trend === "rising"
  return (
    <Badge variant={isRising ? "default" : "secondary"}>
      {isRising && <TrendingUp className="h-3 w-3" />}
      {props.trend}
    </Badge>
  )
}

function ComparisonTable(props: Readonly<IProps>) {
  const { data } = props

  const bestPrice = Math.min(...data.map((d) => d.avgPricePerSqm))
  const yieldsWithData = data.filter((d) => d.grossRentalYield != null)
  const bestYield =
    yieldsWithData.length > 0
      ? Math.max(...yieldsWithData.map((d) => d.grossRentalYield!))
      : null
  const bestTax = Math.min(...data.map((d) => d.transferTaxRate))

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 font-medium">Metric</th>
                {data.map((d) => (
                  <th key={d.key} className="pb-3 font-medium text-right">
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Price per sqm */}
              <tr className="border-b">
                <td className="py-3 font-medium">Avg. Price/m²</td>
                {data.map((d) => (
                  <td
                    key={d.key}
                    className={cn(
                      "py-3 text-right",
                      d.avgPricePerSqm === bestPrice &&
                        "text-green-600 font-semibold",
                    )}
                  >
                    {CURRENCY_FORMATTER.format(d.avgPricePerSqm)}
                  </td>
                ))}
              </tr>

              {/* Price range */}
              <tr className="border-b">
                <td className="py-3 font-medium">Price Range</td>
                {data.map((d) => (
                  <td
                    key={d.key}
                    className="py-3 text-right text-muted-foreground"
                  >
                    {CURRENCY_FORMATTER.format(d.priceRangeMin)} –{" "}
                    {CURRENCY_FORMATTER.format(d.priceRangeMax)}
                  </td>
                ))}
              </tr>

              {/* Rent per sqm */}
              <tr className="border-b">
                <td className="py-3 font-medium">Avg. Rent/m²</td>
                {data.map((d) => (
                  <td key={d.key} className="py-3 text-right">
                    {d.avgRentPerSqm == null ? (
                      <Badge variant="outline">No data</Badge>
                    ) : (
                      RENT_FORMATTER.format(d.avgRentPerSqm)
                    )}
                  </td>
                ))}
              </tr>

              {/* Rent range */}
              <tr className="border-b">
                <td className="py-3 font-medium">Rent Range</td>
                {data.map((d) => (
                  <td
                    key={d.key}
                    className="py-3 text-right text-muted-foreground"
                  >
                    {d.rentRangeMin != null && d.rentRangeMax != null ? (
                      <>
                        {RENT_FORMATTER.format(d.rentRangeMin)} –{" "}
                        {RENT_FORMATTER.format(d.rentRangeMax)}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>

              {/* Gross yield */}
              <tr className="border-b">
                <td className="py-3 font-medium">Gross Yield</td>
                {data.map((d) => (
                  <td
                    key={d.key}
                    className={cn(
                      "py-3 text-right",
                      bestYield != null &&
                        d.grossRentalYield === bestYield &&
                        "text-green-600 font-semibold",
                    )}
                  >
                    {d.grossRentalYield == null ? (
                      <Badge variant="outline">No data</Badge>
                    ) : (
                      `${d.grossRentalYield}%`
                    )}
                  </td>
                ))}
              </tr>

              {/* Transfer tax */}
              <tr className="border-b">
                <td className="py-3 font-medium">Transfer Tax</td>
                {data.map((d) => (
                  <td
                    key={d.key}
                    className={cn(
                      "py-3 text-right",
                      d.transferTaxRate === bestTax &&
                        "text-green-600 font-semibold",
                    )}
                  >
                    {d.transferTaxRate}%
                  </td>
                ))}
              </tr>

              {/* Agent fee */}
              <tr className="border-b">
                <td className="py-3 font-medium">Agent Fee</td>
                {data.map((d) => (
                  <td key={d.key} className="py-3 text-right">
                    {d.agentFeePercent == null ? "—" : `${d.agentFeePercent}%`}
                  </td>
                ))}
              </tr>

              {/* Trend */}
              <tr>
                <td className="py-3 font-medium">Trend</td>
                {data.map((d) => (
                  <td key={d.key} className="py-3 text-right">
                    <TrendBadge trend={d.trend} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ComparisonTable }
