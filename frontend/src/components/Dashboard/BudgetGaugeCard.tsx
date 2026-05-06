/**
 * Budget vs Estimated Cost Gauge Card
 * Shows a gauge comparing the user's budget against estimated total property cost
 */

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"

import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAnimateOnMount } from "@/hooks/useAnimateOnMount"

interface IProps {
  budgetEuros: number | null
  estimatedTotalCost: number | null
}

/******************************************************************************
                              Constants
******************************************************************************/

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const AMBER_THRESHOLD = 0.9

/******************************************************************************
                              Components
******************************************************************************/

/** CTA when no evaluation exists yet. */
function EvaluationCta() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Budget Check</CardTitle>
        <CardDescription>
          Run a cost calculation to see how your budget compares
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to="/calculators">
            Calculate Costs
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/** Main gauge display. */
function GaugeBar(props: Readonly<{ budget: number; estimated: number }>) {
  const { budget, estimated } = props
  const ratio = estimated / budget
  const fillPercent = Math.min(ratio * 100, 100)
  const animatedFillPercent = useAnimateOnMount(fillPercent)
  const overflowPercent = ratio > 1 ? Math.min((ratio - 1) * 100, 100) : 0

  const status =
    ratio <= AMBER_THRESHOLD ? "under" : ratio <= 1 ? "close" : "over"

  const barColor =
    status === "under"
      ? "bg-green-500"
      : status === "close"
        ? "bg-amber-500"
        : "bg-red-500"

  const statusLabel =
    status === "under"
      ? "Under budget"
      : status === "close"
        ? "Close to budget"
        : "Over budget"

  const statusColor =
    status === "under"
      ? "text-green-600 dark:text-green-400"
      : status === "close"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"

  return (
    <div className="space-y-3">
      {/* Gauge bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all motion-reduce:transition-none",
            barColor,
          )}
          style={{ width: `${animatedFillPercent}%` }}
        />
        {overflowPercent > 0 && (
          <div
            className="absolute right-0 top-0 h-full animate-pulse bg-red-500/30"
            style={{ width: `${overflowPercent}%` }}
          />
        )}
        {/* Budget marker line */}
        <div className="absolute right-0 top-0 h-full w-0.5 bg-foreground/40" />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-muted-foreground">Estimated </span>
          <span className="font-semibold">{EUR.format(estimated)}</span>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Budget </span>
          <span className="font-semibold">{EUR.format(budget)}</span>
        </div>
      </div>

      {/* Status badge */}
      <p className={cn("text-center text-xs font-medium", statusColor)}>
        {statusLabel}
        {status === "over" && ` by ${EUR.format(estimated - budget)}`}
      </p>
    </div>
  )
}

/** Default component. Budget gauge card for the dashboard. */
function BudgetGaugeCard(props: Readonly<IProps>) {
  const { budgetEuros, estimatedTotalCost } = props

  if (budgetEuros == null || budgetEuros <= 0 || estimatedTotalCost == null) {
    return <EvaluationCta />
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Budget Check</CardTitle>
        <CardDescription>Budget vs estimated total cost</CardDescription>
      </CardHeader>
      <CardContent>
        <GaugeBar budget={budgetEuros} estimated={estimatedTotalCost} />
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default BudgetGaugeCard
