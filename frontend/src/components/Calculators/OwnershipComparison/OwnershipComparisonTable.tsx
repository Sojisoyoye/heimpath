/**
 * Ownership Comparison Table
 * Year-by-year projection table for both scenarios
 */

import { Separator } from "@/components/ui/separator"
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
                              Components
******************************************************************************/

function OwnershipComparisonTable(props: IProps) {
  const { results } = props

  return (
    <div>
      <Separator className="mb-4" />
      <h4 className="font-medium text-sm text-muted-foreground mb-3">
        Detailed Breakdown
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2 text-left font-medium">Year</th>
              <th className="py-2 text-right font-medium">Rental Income</th>
              <th className="py-2 text-right font-medium">Private Tax</th>
              <th className="py-2 text-right font-medium">Private Net</th>
              <th className="py-2 text-right font-medium">GmbH Tax</th>
              <th className="py-2 text-right font-medium">GmbH Net</th>
              <th className="py-2 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody>
            {results.private.projections.map((priv, i) => {
              const gmbh = results.gmbh.projections[i]
              const diff = gmbh.cumulativeNetIncome - priv.cumulativeNetIncome
              return (
                <tr key={priv.year} className="border-b">
                  <td className="py-2 font-medium">Year {priv.year}</td>
                  <td className="py-2 text-right">
                    {CURRENCY.format(priv.rentalIncome)}
                  </td>
                  <td className="py-2 text-right">
                    {CURRENCY.format(priv.tax)}
                  </td>
                  <td className="py-2 text-right">
                    {CURRENCY.format(priv.cumulativeNetIncome)}
                  </td>
                  <td className="py-2 text-right">
                    {CURRENCY.format(gmbh.tax)}
                  </td>
                  <td className="py-2 text-right">
                    {CURRENCY.format(gmbh.cumulativeNetIncome)}
                  </td>
                  <td
                    className={`py-2 text-right font-medium ${
                      diff > 0 ? "text-purple-600" : "text-blue-600"
                    }`}
                  >
                    {diff > 0 ? "+" : ""}
                    {CURRENCY.format(diff)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { OwnershipComparisonTable }
