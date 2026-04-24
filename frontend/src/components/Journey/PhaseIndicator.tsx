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
          ? "shrink-0 flex-row items-center"
          : "flex-col",
      )}
    >
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
            isCompleted && "border-amber-600 bg-amber-600 text-white",
            isCurrent &&
              !isCompleted &&
              "border-blue-600 bg-blue-600 text-white",
            !isCurrent &&
              !isCompleted &&
              "border-muted-foreground/30 text-muted-foreground",
          )}
        >
          {isCompleted ? <Check className="h-3.5 w-3.5" /> : phase.order}
        </div>
        <span
          className={cn(
            "whitespace-nowrap text-xs font-medium",
            isCurrent && "text-foreground",
            isCompleted && "text-amber-600",
            !isCurrent && !isCompleted && "text-muted-foreground",
          )}
        >
          {phase.label}
        </span>
      </div>

      {!isLast && variant === "horizontal" && (
        <div
          className={cn(
            "mx-2 h-0.5 w-8 shrink-0",
            isCompleted ? "bg-amber-600" : "bg-muted-foreground/30",
          )}
        />
      )}

      {!isLast && variant === "vertical" && (
        <div
          className={cn(
            "mb-2 ml-4 mt-2 h-8 w-0.5",
            isCompleted ? "bg-amber-600" : "bg-muted-foreground/30",
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
        variant === "horizontal" ? "overflow-x-auto" : "flex flex-col",
        className,
      )}
    >
      <div
        className={cn(
          "flex",
          variant === "horizontal"
            ? "min-w-max flex-row items-center py-1"
            : "flex-col",
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
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PhaseIndicator }
