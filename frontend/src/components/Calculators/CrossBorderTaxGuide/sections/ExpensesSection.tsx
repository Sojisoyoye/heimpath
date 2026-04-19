/**
 * Deductible Expenses Section
 * Shows which expenses are deductible and non-resident availability
 */

import { CheckCircle2, Receipt, XCircle } from "lucide-react"
import type { ICountryTaxData } from "../types"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  expenses: ICountryTaxData["expenses"]
}

/******************************************************************************
                              Components
******************************************************************************/

function ExpensesSection(props: Readonly<IProps>) {
  const { expenses } = props

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-semibold text-sm">Deductible Expenses</h4>
      </div>
      <div className="space-y-1.5">
        {expenses.map((e) => (
          <div key={e.category} className="flex items-start gap-2 text-sm">
            {e.availableToNonResidents ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-medium">{e.category}</span>
              <span className="text-muted-foreground"> — {e.description}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        <CheckCircle2 className="inline h-3 w-3 text-green-600 mr-1" />
        Available to non-residents
        <XCircle className="inline h-3 w-3 text-red-500 ml-3 mr-1" />
        Residents only
      </p>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ExpensesSection }
