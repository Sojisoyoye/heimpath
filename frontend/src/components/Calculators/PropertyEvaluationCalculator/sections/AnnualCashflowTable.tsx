/**
 * Annual Cashflow Table
 * Horizontally scrollable table showing year-by-year cashflow projection
 */

import { cn } from "@/common/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnnualCashflowRow } from "../types"

interface IProps {
  rows: AnnualCashflowRow[]
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const EUR_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Annual cashflow projection table. */
function AnnualCashflowTable(props: IProps) {
  const { rows, className } = props

  if (rows.length === 0) return null

  const exitIndex = rows.length - 1

  const totalColdRent = rows.reduce((sum, r) => sum + r.coldRent, 0)
  const totalInterest = rows.reduce((sum, r) => sum + r.interest, 0)
  const totalRepayment = rows.reduce((sum, r) => sum + r.repayment, 0)
  const totalNetCfAfterTax = rows.reduce((sum, r) => sum + r.netCfAfterTax, 0)

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="py-3">
        <CardTitle className="text-base">
          Annual Cashflow Projection
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
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
                      isExit && "bg-blue-50 font-semibold dark:bg-blue-950/30",
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
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { AnnualCashflowTable }
