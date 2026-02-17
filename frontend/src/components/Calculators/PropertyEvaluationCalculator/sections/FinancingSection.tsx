/**
 * Financing Section
 * Inputs for loan settings
 */

import { Landmark } from "lucide-react"
import { SECTION_COLORS } from "@/common/constants/propertyEvaluation"
import { cn } from "@/common/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FinancingInputs } from "../types"

interface IProps {
  values: FinancingInputs
  purchasePrice: number
  totalInvestment: number
  onChange: (updates: Partial<FinancingInputs>) => void
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Financing section. */
function FinancingSection(props: IProps) {
  const { values, purchasePrice, totalInvestment, onChange, className } = props

  const handleNumberChange = (field: keyof FinancingInputs, value: string) => {
    const num = parseFloat(value) || 0
    onChange({ [field]: num })
  }

  // Loan is % of purchase price, equity covers the rest of total investment
  const loanAmount = purchasePrice * (values.loanPercent / 100)
  const equityAmount = totalInvestment - loanAmount
  const monthlyInterest = (loanAmount * (values.interestRatePercent / 100)) / 12
  const monthlyRepayment =
    (loanAmount * (values.repaymentRatePercent / 100)) / 12
  const debtServiceMonthly = monthlyInterest + monthlyRepayment

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("py-3", SECTION_COLORS.financing)}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4" />
          Financing
        </CardTitle>
        <p className="text-xs font-normal opacity-80 mt-1">
          Retrieve from bank offer
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Loan settings */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="loanPercent">Loan (% of purchase price)</Label>
            <Input
              id="loanPercent"
              type="number"
              step="5"
              min="0"
              max="100"
              placeholder="e.g., 100"
              value={values.loanPercent || ""}
              onChange={(e) =>
                handleNumberChange("loanPercent", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interestRate">Interest Rate (%)</Label>
            <Input
              id="interestRate"
              type="number"
              step="0.1"
              min="0"
              max="15"
              placeholder="e.g., 4.0"
              value={values.interestRatePercent || ""}
              onChange={(e) =>
                handleNumberChange("interestRatePercent", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repaymentRate">
              Initial Repayment / Acquittance (%)
            </Label>
            <Input
              id="repaymentRate"
              type="number"
              step="0.5"
              min="0"
              max="10"
              placeholder="e.g., 2.0"
              value={values.repaymentRatePercent || ""}
              onChange={(e) =>
                handleNumberChange("repaymentRatePercent", e.target.value)
              }
            />
          </div>
        </div>

        {/* Financing summary */}
        {purchasePrice > 0 && (
          <div className="rounded-md bg-purple-50 p-3 space-y-2 dark:bg-purple-950/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Loan Amount</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(loanAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Own Capital / Equity
              </span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(equityAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span className="text-muted-foreground">Monthly Interest</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(monthlyInterest)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly Repayment</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(monthlyRepayment)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span className="text-muted-foreground">
                Debt Service per Month
              </span>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                {CURRENCY_FORMATTER.format(debtServiceMonthly)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FinancingSection }
