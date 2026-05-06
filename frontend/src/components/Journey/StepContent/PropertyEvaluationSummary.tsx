/**
 * Property Evaluation Summary Component
 * Displays saved evaluations for a journey step
 */

import { useNavigate } from "@tanstack/react-router"
import { Calculator } from "lucide-react"

import { formatEur } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { useStepPropertyEvaluations } from "@/hooks/queries/useCalculatorQueries"

interface IProps {
  journeyId: string
  stepId: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Summary of saved property evaluations. */
function PropertyEvaluationSummary(props: IProps) {
  const { journeyId, stepId } = props
  const navigate = useNavigate()

  const { data } = useStepPropertyEvaluations(stepId)
  const evaluations = data?.data ?? []

  const handleOpenCalculator = () => {
    navigate({
      to: "/journeys/$journeyId/property-evaluation",
      params: { journeyId },
    })
  }

  return (
    <div className="space-y-3">
      {evaluations.map((ev) => (
        <div
          key={ev.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {ev.name || "Property Evaluation"}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{formatEur(ev.purchasePrice)}</span>
              <span
                className={
                  ev.isPositiveCashflow ? "text-green-600" : "text-red-600"
                }
              >
                {formatEur(ev.cashflowAfterTax)}/mo
              </span>
              <span>{ev.grossRentalYield.toFixed(1)}% yield</span>
            </div>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        className="w-full"
        onClick={handleOpenCalculator}
      >
        <Calculator className="h-4 w-4" />
        {evaluations.length > 0
          ? "Open Evaluation Calculator"
          : "Property Evaluation Calculator"}
      </Button>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyEvaluationSummary }
