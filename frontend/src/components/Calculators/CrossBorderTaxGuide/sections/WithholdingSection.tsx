/**
 * Withholding Rates Section
 * Grid of German withholding/tax rates for non-residents
 */

import { Receipt } from "lucide-react"
import type { ICountryTaxData } from "../types"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  withholding: ICountryTaxData["withholding"]
}

/******************************************************************************
                              Components
******************************************************************************/

function WithholdingSection(props: Readonly<IProps>) {
  const { withholding } = props
  const rates = [
    { key: "Rental Income", ...withholding.rentalIncome },
    { key: "Capital Gains", ...withholding.capitalGains },
    { key: "Dividends", ...withholding.dividends },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-semibold text-sm">
          German Withholding / Tax Rates
        </h4>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {rates.map((r) => (
          <div
            key={r.key}
            className="rounded-lg border p-3 text-center space-y-1"
          >
            <p className="text-xs text-muted-foreground">{r.key}</p>
            <p className="text-lg font-bold">{r.label}</p>
            {r.note && (
              <p className="text-xs text-muted-foreground">{r.note}</p>
            )}
          </div>
        ))}
      </div>
      {withholding.dbaReducedDividends && (
        <p className="text-xs text-muted-foreground">
          DBA-reduced dividend rate: {withholding.dbaReducedDividends.label}
          {withholding.dbaReducedDividends.note &&
            ` (${withholding.dbaReducedDividends.note})`}
        </p>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { WithholdingSection }
