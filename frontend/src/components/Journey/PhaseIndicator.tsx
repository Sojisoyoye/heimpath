/**
 * Phase Indicator Component
 * Displays journey phases with current phase highlighted
 */

import { Check } from "lucide-react"
import { JOURNEY_PHASES } from "@/common/constants"
import { cn } from "@/common/utils"
import type { JourneyPhase } from "@/models/journey"

interface IProps {
  currentPhase: JourneyPhase
  completedPhases?: JourneyPhase[]
  variant?: "horizontal" | "vertical"
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Single phase step indicator. */
function PhaseStep(props: {
  phase: (typeof JOURNEY_PHASES)[number]
  isCurrent: boolean
  isCompleted: boolean
  isLast: boolean
  variant: "horizontal" | "vertical"
}) {
  const { phase, isCurrent, isCompleted, isLast, variant } = props

  return (
    <div
      className={cn(
        "flex items-center",
        variant === "horizontal"
          ? "min-w-0 flex-row items-center sm:flex-1"
          : "flex-col",
      )}
    >
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1 sm:gap-2">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors sm:h-8 sm:w-8 sm:text-sm",
              isCompleted && "border-green-600 bg-green-600 text-white",
              isCurrent &&
                !isCompleted &&
                "border-blue-600 bg-blue-600 text-white",
              !isCurrent &&
                !isCompleted &&
                "border-muted-foreground/30 text-muted-foreground",
            )}
          >
            {isCompleted ? (
              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              phase.order
            )}
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              isCurrent && "text-foreground",
              isCompleted && "text-green-600",
              !isCurrent && !isCompleted && "text-muted-foreground",
              variant === "horizontal" && "hidden sm:inline",
            )}
          >
            {phase.label}
          </span>
        </div>
        {isCurrent && !isCompleted && variant === "horizontal" && (
          <div className="h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-blue-600 sm:hidden" />
        )}
      </div>

      {!isLast && variant === "horizontal" && (
        <div
          className={cn(
            "mx-1 h-0.5 w-4 sm:mx-2 sm:w-auto sm:flex-1",
            isCompleted ? "bg-green-600" : "bg-muted-foreground/30",
          )}
        />
      )}

      {!isLast && variant === "vertical" && (
        <div
          className={cn(
            "ml-4 mt-2 mb-2 w-0.5 h-8",
            isCompleted ? "bg-green-600" : "bg-muted-foreground/30",
          )}
        />
      )}
    </div>
  )
}

/** Default component. Phase indicator showing journey progress through phases. */
function PhaseIndicator(props: IProps) {
  const {
    currentPhase,
    completedPhases = [],
    variant = "horizontal",
    className,
  } = props

  const currentPhaseIndex = JOURNEY_PHASES.findIndex(
    (p) => p.key === currentPhase,
  )

  return (
    <div
      className={cn(
        "flex",
        variant === "horizontal" ? "flex-row items-center" : "flex-col",
        className,
      )}
    >
      {JOURNEY_PHASES.map((phase, index) => (
        <PhaseStep
          key={phase.key}
          phase={phase}
          isCurrent={phase.key === currentPhase}
          isCompleted={
            completedPhases.includes(phase.key as JourneyPhase) ||
            index < currentPhaseIndex
          }
          isLast={index === JOURNEY_PHASES.length - 1}
          variant={variant}
        />
      ))}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PhaseIndicator }
