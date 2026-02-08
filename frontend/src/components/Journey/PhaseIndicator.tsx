/**
 * Phase Indicator Component
 * Displays journey phases with current phase highlighted
 */

import { Check } from "lucide-react"

import { cn } from "@/common/utils"
import { JOURNEY_PHASES } from "@/common/constants"
import Colors from "@/common/styles/Colors"
import type { JourneyPhase } from "@/models/journey"

interface IProps {
  currentPhase: JourneyPhase
  completedPhases?: JourneyPhase[]
  variant?: "horizontal" | "vertical"
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const PHASE_COLORS: Record<JourneyPhase, string> = {
  research: Colors.Journey.Research,
  preparation: Colors.Journey.Preparation,
  buying: Colors.Journey.Buying,
  closing: Colors.Journey.Closing,
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
  const phaseKey = phase.key as JourneyPhase

  return (
    <div
      className={cn(
        "flex items-center",
        variant === "horizontal" ? "flex-1" : "flex-col"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
            isCompleted && "border-green-600 bg-green-600 text-white",
            isCurrent &&
              !isCompleted &&
              "border-blue-600 bg-blue-600 text-white",
            !isCurrent && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
          )}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" />
          ) : (
            phase.order
          )}
        </div>
        <span
          className={cn(
            "text-sm font-medium",
            isCurrent && "text-foreground",
            isCompleted && "text-green-600",
            !isCurrent && !isCompleted && "text-muted-foreground"
          )}
        >
          {phase.label}
        </span>
      </div>

      {!isLast && variant === "horizontal" && (
        <div
          className={cn(
            "mx-2 h-0.5 flex-1",
            isCompleted ? "bg-green-600" : "bg-muted-foreground/30"
          )}
        />
      )}

      {!isLast && variant === "vertical" && (
        <div
          className={cn(
            "ml-4 mt-2 mb-2 w-0.5 h-8",
            isCompleted ? "bg-green-600" : "bg-muted-foreground/30"
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
    (p) => p.key === currentPhase
  )

  return (
    <div
      className={cn(
        "flex",
        variant === "horizontal" ? "flex-row items-center" : "flex-col",
        className
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
