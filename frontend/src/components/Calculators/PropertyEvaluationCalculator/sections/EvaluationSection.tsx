/**
 * Evaluation Section
 * Displays calculated results: yields, cashflow, tax, and return on equity
 */

import {
  Calculator,
  Home,
  Info,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { SECTION_COLORS } from "@/common/constants/propertyEvaluation"
import { cn } from "@/common/utils"
import {
  EUR_FORMATTER_2 as CURRENCY_FORMATTER,
  PERCENT_FORMATTER,
} from "@/common/utils/formatters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { EvaluationResults } from "../types"

interface IProps {
  results: EvaluationResults | null
  isOwnerOccupier?: boolean
  isLoading?: boolean
  className?: string
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Format tax impact: positive = benefit ("+"), negative = tax ("-"). */
function formatTaxImpact(value: number): {
  label: string
  formatted: string
} {
  if (value >= 0) {
    return {
      label: "Tax Benefit",
      formatted: `+ ${CURRENCY_FORMATTER.format(value)}`,
    }
  }
  return {
    label: "Taxes",
    formatted: `- ${CURRENCY_FORMATTER.format(Math.abs(value))}`,
  }
}

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

/** Loading spinner overlay. */
function LoadingOverlay() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Calculating...</span>
    </div>
  )
}

/** Owner-occupier results view. */
function OwnerOccupierView(props: { results: EvaluationResults }) {
  const { results } = props
  const monthlyCost = results.totalHausgeldMonthly + results.monthlyDebtService

  return (
    <CardContent className="space-y-4 pt-4">
      {/* Hero: Monthly Cost of Ownership */}
      <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-950/30">
        <div className="mb-2 flex items-center gap-2">
          <Home className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium">Monthly Cost of Ownership</span>
        </div>
        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {CURRENCY_FORMATTER.format(monthlyCost)} / month
        </span>
      </div>

      {/* Monthly Cost Breakdown */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Monthly Cost Breakdown
        </p>
        <ResultLine
          label="Management Costs (Hausgeld)"
          value={CURRENCY_FORMATTER.format(results.totalHausgeldMonthly)}
        />
        <ResultLine
          label="Interest"
          value={CURRENCY_FORMATTER.format(results.monthlyInterestYr1)}
        />
        <ResultLine
          label="Repayment / Acquittance"
          value={CURRENCY_FORMATTER.format(results.monthlyRepaymentYr1)}
        />
        <Separator />
        <ResultLine
          label="Total Monthly Cost"
          value={CURRENCY_FORMATTER.format(monthlyCost)}
          highlight
        />
      </div>
    </CardContent>
  )
}

/** Investment results view. */
function InvestorView(props: { results: EvaluationResults }) {
  const { results } = props
  const isPositive = results.monthlyCashflowAfterTax >= 0
  const CashflowIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <CardContent className="space-y-4 pt-4">
      {/* Main cashflow display */}
      <div
        className={cn(
          "rounded-lg p-4 border-2",
          isPositive
            ? "bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700"
            : "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700",
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <CashflowIcon
            className={cn(
              "h-5 w-5",
              isPositive ? "text-green-600" : "text-red-600",
            )}
          />
          <span className="text-sm font-medium">Cashflow after Taxes</span>
        </div>
        <span
          className={cn(
            "text-2xl font-bold",
            isPositive
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400",
          )}
        >
          {CURRENCY_FORMATTER.format(results.monthlyCashflowAfterTax)} / month
        </span>
      </div>

      {/* Rent and Rental Yield */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Rent and Rental Yield
        </p>
        <ResultLine
          label="Net Cold Rent per Year"
          value={CURRENCY_FORMATTER.format(results.netColdRentAnnual)}
        />
        <ResultLine
          label="Gross Rental Yield"
          value={PERCENT_FORMATTER.format(results.grossRentalYield)}
          highlight
          info="Annual cold rent / Purchase price"
        />
        <ResultLine
          label="Factor of Cold Rent vs. Price"
          value={results.factorColdRentVsPrice.toFixed(1)}
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
          value={`- ${CURRENCY_FORMATTER.format(results.totalHausgeldMonthly)}`}
        />
        <ResultLine
          label="- Interest"
          value={`- ${CURRENCY_FORMATTER.format(results.monthlyInterestYr1)}`}
        />
        <ResultLine
          label="- Repayment / Acquittance"
          value={`- ${CURRENCY_FORMATTER.format(results.monthlyRepaymentYr1)}`}
        />
        <ResultLine
          label="= Cashflow"
          value={CURRENCY_FORMATTER.format(results.monthlyCashflowPretax)}
          highlight
        />
        <div className="text-xs text-muted-foreground italic py-1">
          your surplus before taxes
        </div>
        <ResultLine
          label={`- ${formatTaxImpact(results.monthlyTaxBenefit).label}`}
          value={formatTaxImpact(results.monthlyTaxBenefit).formatted}
        />
        <ResultLine
          label="= Cashflow after Taxes"
          value={CURRENCY_FORMATTER.format(results.monthlyCashflowAfterTax)}
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
          value={`- ${CURRENCY_FORMATTER.format(results.totalHausgeldMonthly)}`}
        />
        <ResultLine
          label="- Interest"
          value={`- ${CURRENCY_FORMATTER.format(results.monthlyInterestYr1)}`}
        />
        <ResultLine
          label="- Depreciation (AfA)"
          value={`- ${CURRENCY_FORMATTER.format(results.monthlyAfaDisplay)}`}
          info="Tax-deductible depreciation on building value"
        />
        <ResultLine
          label="= Taxable Property Income"
          value={CURRENCY_FORMATTER.format(
            results.monthlyTaxablePropertyIncome,
          )}
          highlight
        />
        <ResultLine
          label={`= ${formatTaxImpact(results.monthlyTaxBenefit).label}`}
          value={formatTaxImpact(results.monthlyTaxBenefit).formatted}
          highlight
          info={
            results.monthlyTaxBenefit >= 0
              ? "Negative taxable income creates a tax benefit (added to cashflow)"
              : "Subtracted from cashflow"
          }
        />
      </div>

      <Separator />

      {/* KPI Summary */}
      {results.annualRows.length > 0 && (
        <>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {results.annualRows.length}-Year KPI Summary
            </p>
            <ResultLine
              label="Total Net CF After Tax"
              value={CURRENCY_FORMATTER.format(results.totalNetCfAfterTax)}
              highlight
            />
            <ResultLine
              label="Total Equity Invested"
              value={CURRENCY_FORMATTER.format(results.totalEquityInvested)}
            />
            <ResultLine
              label="Final Equity KPI"
              value={CURRENCY_FORMATTER.format(results.finalEquityKpi)}
              highlight
              info="Equity buildup minus total equity invested"
            />
          </div>
          <Separator />
        </>
      )}
    </CardContent>
  )
}

/** Default component. Evaluation results section. */
function EvaluationSection(props: IProps) {
  const { results, isOwnerOccupier, isLoading, className } = props

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
          {isLoading ? <LoadingOverlay /> : <EmptyState />}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("overflow-hidden relative", className)}>
      <CardHeader className={cn("py-3", SECTION_COLORS.evaluation)}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4" />
          Evaluation
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
          )}
        </CardTitle>
      </CardHeader>
      {isOwnerOccupier ? (
        <OwnerOccupierView results={results} />
      ) : (
        <InvestorView results={results} />
      )}
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { EvaluationSection }
