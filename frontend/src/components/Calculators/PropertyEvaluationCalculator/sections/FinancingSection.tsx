/**
 * Financing Section
 * Inputs for loan settings with optional 110% financing (acquisition costs included)
 */

import { Info, Landmark } from "lucide-react"
import { SECTION_COLORS } from "@/common/constants/propertyEvaluation"
import { cn } from "@/common/utils"
import { EUR_FORMATTER_2 as CURRENCY_FORMATTER } from "@/common/utils/formatters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormRow } from "../../common/FormRow"
import type { FinancingInputs } from "../types"

interface IProps {
  values: FinancingInputs
  purchasePrice: number
  totalInvestment: number
  onChange: (updates: Partial<FinancingInputs>) => void
  className?: string
}

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

  const loanBasis = values.includeAcquisitionCosts
    ? totalInvestment
    : purchasePrice
  const loanAmount = loanBasis * (values.loanPercent / 100)
  const equityAmount = totalInvestment - loanAmount
  const monthlyInterest = (loanAmount * (values.interestRatePercent / 100)) / 12
  const monthlyRepayment =
    (loanAmount * (values.repaymentRatePercent / 100)) / 12
  const debtServiceMonthly = monthlyInterest + monthlyRepayment

  const loanLabel = values.includeAcquisitionCosts
    ? "Loan (% of total inv.)"
    : "Loan (% of price)"

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
      <CardContent className="space-y-3 pt-4">
        {/* 110% financing toggle */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="includeAcquisitionCosts"
            checked={values.includeAcquisitionCosts}
            onCheckedChange={(checked) =>
              onChange({ includeAcquisitionCosts: checked === true })
            }
            className="mt-0.5"
          />
          <div>
            <Label
              htmlFor="includeAcquisitionCosts"
              className="cursor-pointer leading-tight"
            >
              Include acquisition costs in loan (110% financing)
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Finance both the purchase price and all additional costs (notary,
              broker, transfer tax, land registry)
            </p>
          </div>
        </div>

        {values.includeAcquisitionCosts && (
          <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 dark:bg-blue-950/30">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-blue-800 dark:text-blue-300">
              110% financing means your bank loan covers the property price plus
              all acquisition costs. This reduces required equity to zero but
              increases monthly payments and total interest paid. Many German
              banks offer this for creditworthy borrowers.
            </p>
          </div>
        )}

        {/* Loan settings */}
        <FormRow htmlFor="loanPercent" label={loanLabel}>
          <Input
            id="loanPercent"
            type="number"
            step="5"
            min="0"
            max="100"
            placeholder="e.g., 100"
            value={values.loanPercent || ""}
            onChange={(e) => handleNumberChange("loanPercent", e.target.value)}
          />
        </FormRow>
        <FormRow htmlFor="interestRate" label="Interest Rate (%)">
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
        </FormRow>
        <FormRow htmlFor="repaymentRate" label="Repayment Rate (%)">
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
        </FormRow>

        {/* Financing summary */}
        {purchasePrice > 0 && (
          <div className="rounded-md bg-purple-50 p-3 space-y-2 dark:bg-purple-950/30">
            {values.includeAcquisitionCosts && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Loan Basis</span>
                <span className="font-medium">
                  {CURRENCY_FORMATTER.format(totalInvestment)}
                </span>
              </div>
            )}
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
              <span
                className={cn(
                  "font-medium",
                  equityAmount <= 0 && "text-amber-600 dark:text-amber-400",
                )}
              >
                {CURRENCY_FORMATTER.format(Math.max(equityAmount, 0))}
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
