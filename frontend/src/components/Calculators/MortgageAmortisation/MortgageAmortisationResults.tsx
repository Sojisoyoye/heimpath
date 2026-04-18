/**
 * Mortgage Amortisation Results
 * Summary metric cards showing key mortgage figures
 */

import { Calendar, Euro, Percent, TrendingUp } from "lucide-react"
import { cn } from "@/common/utils"
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

function MetricCard(
  props: Readonly<{
    icon: React.ReactNode
    label: string
    value: string
    subText?: string
    className?: string
  }>,
) {
  const { icon, label, value, subText, className } = props

  return (
    <div className={cn("rounded-lg border p-4 space-y-1", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold">{value}</p>
      {subText && <p className="text-xs text-muted-foreground">{subText}</p>}
    </div>
  )
}

function getLtvColor(ltvRatio: number): string {
  if (ltvRatio < 60) {
    return "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
  }
  if (ltvRatio <= 80) {
    return "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
  }
  return "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
}

function getLtvDescription(ltvRatio: number): string {
  if (ltvRatio < 60) return "Excellent — best rates available"
  if (ltvRatio <= 80) return "Good — standard mortgage rates"
  return "High — may face higher rates"
}

function MortgageAmortisationResults(props: Readonly<IProps>) {
  const { result, fixedRatePeriod } = props

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          icon={<Euro className="h-4 w-4" />}
          label="Monthly Payment"
          value={CURRENCY.format(result.monthlyPayment)}
          subText={`${CURRENCY.format(result.annualPayment)} / year`}
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Total Interest"
          value={CURRENCY.format(result.totalInterestOverLife)}
          subText={`${CURRENCY.format(result.totalInterestDuringFixed)} during fixed period`}
        />
        <MetricCard
          icon={<Calendar className="h-4 w-4" />}
          label="Payoff Date"
          value={result.fullRepaymentDate}
          subText={`${result.yearsToFullRepayment} years`}
        />
        <MetricCard
          icon={<Percent className="h-4 w-4" />}
          label="LTV Ratio"
          value={`${result.ltvRatio.toFixed(1)}%`}
          subText={getLtvDescription(result.ltvRatio)}
          className={getLtvColor(result.ltvRatio)}
        />
      </div>

      {/* Remaining balance highlight */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-sm">
        <span className="font-medium text-blue-800 dark:text-blue-300">
          Remaining balance after {fixedRatePeriod}-year Zinsbindung:{" "}
          {CURRENCY.format(result.remainingBalanceAtFixedEnd)}
        </span>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          You will need Anschlussfinanzierung (follow-up financing) for this
          amount
        </p>
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MortgageAmortisationResults }
