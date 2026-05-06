/**
 * Mortgage Amortisation Table
 * Year-by-year amortisation schedule
 */

import { cn } from "@/common/utils"
import { Separator } from "@/components/ui/separator"
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
                              Components
******************************************************************************/

function MortgageAmortisationTable(props: Readonly<IProps>) {
  const { result, fixedRatePeriod } = props

  return (
    <div>
      <Separator className="mb-4" />
      <h4 className="font-medium text-sm text-muted-foreground mb-3">
        Amortisation Schedule
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="w-px whitespace-nowrap py-2 text-left font-medium">
                Year
              </th>
              <th className="py-2 text-right font-medium">Payment</th>
              <th className="py-2 text-right font-medium">Interest</th>
              <th className="py-2 text-right font-medium">Principal</th>
              <th className="py-2 text-right font-medium">Special</th>
              <th className="py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {result.schedule.map((row) => {
              const isFixedEnd = row.year === fixedRatePeriod
              return (
                <tr
                  key={row.year}
                  className={cn(
                    "border-b",
                    isFixedEnd &&
                      "bg-blue-50/50 dark:bg-blue-950/20 font-medium",
                  )}
                >
                  <td className="w-px whitespace-nowrap py-2 pr-4">
                    Year {row.year}
                    {isFixedEnd && (
                      <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">
                        (Zinsbindung)
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {CURRENCY.format(row.annualPayment)}
                  </td>
                  <td className="py-2 text-right">
                    {CURRENCY.format(row.interestPortion)}
                  </td>
                  <td className="py-2 text-right">
                    {CURRENCY.format(row.principalPortion)}
                  </td>
                  <td className="py-2 text-right">
                    {row.specialRepayment > 0
                      ? CURRENCY.format(row.specialRepayment)
                      : "—"}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {CURRENCY.format(row.remainingBalance)}
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

export { MortgageAmortisationTable }
