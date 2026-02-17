/**
 * Evaluation Section
 * Displays calculated results: yields, cashflow, tax, and return on equity
 */

import { Calculator, Info, TrendingDown, TrendingUp } from "lucide-react"
import { SECTION_COLORS } from "@/common/constants/propertyEvaluation"
import { cn } from "@/common/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { EvaluationResults } from "../types"

interface IProps {
  results: EvaluationResults | null
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

const PERCENT_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/******************************************************************************
                              Components
******************************************************************************/

/** Line item display. */
function ResultLine(props: {
  label: string
  value: string
  highlight?: boolean
  info?: string
}) {
  const { label, value, highlight, info } = props

  return (
    <div
      className={cn(
        "flex items-center justify-between py-1",
        highlight && "font-semibold",
      )}
    >
      <div className="flex items-center gap-1 text-sm">
        <span className="text-muted-foreground">{label}</span>
        {info && (
          <span className="text-xs text-muted-foreground" title={info}>
            <Info className="h-3 w-3" />
          </span>
        )}
      </div>
      <span className={cn("text-sm", highlight && "text-base")}>{value}</span>
    </div>
  )
}

/** Empty state when no results. */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">
        Enter property details to see the evaluation
      </p>
    </div>
  )
}

/** Default component. Evaluation results section. */
function EvaluationSection(props: IProps) {
  const { results, className } = props

  if (!results) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className={cn("py-3", SECTION_COLORS.evaluation)}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            Evaluation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    )
  }

  const CashflowIcon = results.isPositiveCashflow ? TrendingUp : TrendingDown

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("py-3", SECTION_COLORS.evaluation)}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4" />
          Evaluation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Main cashflow display */}
        <div
          className={cn(
            "rounded-lg p-4 border-2",
            results.isPositiveCashflow
              ? "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700"
              : "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700",
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <CashflowIcon
              className={cn(
                "h-5 w-5",
                results.isPositiveCashflow ? "text-green-600" : "text-red-600",
              )}
            />
            <span className="text-sm font-medium">Cashflow after Taxes</span>
          </div>
          <span
            className={cn(
              "text-2xl font-bold",
              results.isPositiveCashflow
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {CURRENCY_FORMATTER.format(results.cashflowAfterTax)} / month
          </span>
        </div>

        {/* Rent and Rental Yield */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Rent and Rental Yield
          </p>
          <ResultLine
            label="Net Cold Rent per Year"
            value={CURRENCY_FORMATTER.format(results.netColdRentYearly)}
          />
          <ResultLine
            label="Gross Rental Yield"
            value={PERCENT_FORMATTER.format(results.grossRentalYield / 100)}
            highlight
            info="Annual cold rent / Purchase price"
          />
          <ResultLine
            label="Factor of Cold Rent vs. Price"
            value={results.coldRentFactor.toFixed(1)}
            info="Purchase price / Annual cold rent (Kaufpreisfaktor)"
          />
        </div>

        <Separator />

        {/* Cashflow per Month */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Cashflow per Month
          </p>
          <ResultLine
            label="Warm Rent"
            value={CURRENCY_FORMATTER.format(results.warmRentMonthly)}
          />
          <ResultLine
            label="- Management Costs"
            value={`- ${CURRENCY_FORMATTER.format(results.totalHausgeld)}`}
          />
          <ResultLine
            label="- Interest"
            value={`- ${CURRENCY_FORMATTER.format(results.monthlyInterest)}`}
          />
          <ResultLine
            label="- Repayment / Acquittance"
            value={`- ${CURRENCY_FORMATTER.format(results.monthlyRepayment)}`}
          />
          <ResultLine
            label="= Cashflow"
            value={CURRENCY_FORMATTER.format(results.cashflowBeforeTax)}
            highlight
          />
          <div className="text-xs text-muted-foreground italic py-1">
            your surplus before taxes
          </div>
          <ResultLine
            label={results.taxMonthly >= 0 ? "- Taxes" : "- Tax Benefit"}
            value={`- ${CURRENCY_FORMATTER.format(Math.abs(results.taxMonthly))}`}
          />
          <ResultLine
            label="= Cashflow after Taxes"
            value={CURRENCY_FORMATTER.format(results.cashflowAfterTax)}
            highlight
          />
        </div>

        <Separator />

        {/* Tax Calculation */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Tax Calculation
          </p>
          <ResultLine
            label="Warm Rent"
            value={CURRENCY_FORMATTER.format(results.warmRentMonthly)}
          />
          <ResultLine
            label="- Management Costs"
            value={`- ${CURRENCY_FORMATTER.format(results.totalHausgeld)}`}
          />
          <ResultLine
            label="- Interest"
            value={`- ${CURRENCY_FORMATTER.format(results.monthlyInterest)}`}
          />
          <ResultLine
            label="- Depreciation (AfA)"
            value={`- ${CURRENCY_FORMATTER.format(results.depreciationMonthly)}`}
            info="Tax-deductible depreciation on building value"
          />
          <ResultLine
            label="= Taxable Cashflow"
            value={CURRENCY_FORMATTER.format(results.taxableCashflowMonthly)}
            highlight
          />
          <ResultLine
            label={results.taxMonthly >= 0 ? "= Taxes" : "= Tax Benefit"}
            value={
              results.taxMonthly >= 0
                ? CURRENCY_FORMATTER.format(results.taxMonthly)
                : `- ${CURRENCY_FORMATTER.format(Math.abs(results.taxMonthly))}`
            }
            highlight
            info={
              results.taxMonthly >= 0
                ? "Subtracted from cashflow"
                : "Negative taxable income creates a tax benefit (added to cashflow)"
            }
          />
        </div>

        <Separator />

        {/* Return on Equity in Year 1 */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Return on Equity in Year 1
          </p>
          <ResultLine
            label="Return on Equity"
            value={PERCENT_FORMATTER.format(results.returnOnEquity / 100)}
            highlight
            info="(Annual cashflow + appreciation) / Equity"
          />
          <ResultLine
            label="Without Appreciation"
            value={PERCENT_FORMATTER.format(
              results.returnOnEquityWithoutAppreciation / 100,
            )}
            info="Annual cashflow / Equity"
          />
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { EvaluationSection }
