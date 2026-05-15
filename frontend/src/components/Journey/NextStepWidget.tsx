/**
 * Next Step Widget
 * Sticky orientation card showing the user exactly what to focus on right now.
 * Designed for returning users who need to re-engage quickly after time away.
 */

import { ArrowRight, Circle, Target } from "lucide-react"
import { JOURNEY_PHASES, PHASE_COLORS } from "@/common/constants"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type {
  JourneyPhase,
  JourneyProgress,
  JourneyPublic,
} from "@/models/journey"

interface IProps {
  journey: JourneyPublic
  progress?: JourneyProgress
  /** Called when the user clicks "Continue" — passes the active step's phase. */
  onContinue: (phaseKey: JourneyPhase) => void
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Sticky next-step orientation card. */
function NextStepWidget(props: IProps) {
  const { journey, progress, onContinue } = props

  const activeStep = journey.steps.find(
    (s) => s.step_number === journey.current_step_number,
  )

  // Don't render if journey is complete or active step can't be determined.
  const isComplete =
    !!journey.completed_at ||
    (journey.steps.length > 0 &&
      journey.steps.every(
        (s) => s.status === "completed" || s.status === "skipped",
      ))

  if (isComplete || !activeStep) return null

  const pendingTasks = activeStep.tasks.filter((t) => !t.is_completed)
  const shownTasks = pendingTasks.slice(0, 2)
  const hiddenTaskCount = pendingTasks.length - shownTasks.length

  const phaseLabel =
    JOURNEY_PHASES.find((p) => p.key === activeStep.phase)?.label ??
    activeStep.phase
  const progressPercent = Math.round(
    progress?.progress_percentage ?? journey.progress_percentage,
  )
  const completedSteps = progress?.completed_steps ?? journey.completed_steps
  const totalSteps = progress?.total_steps ?? journey.total_steps

  return (
    <Card className="sticky top-16 z-10 border-l-[3px] border-l-primary shadow-sm">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
        {/* Phase icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Target className="h-5 w-5 text-primary" />
        </div>

        {/* Step info */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className={cn("shrink-0 text-xs", PHASE_COLORS[activeStep.phase])}
            >
              {phaseLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {completedSteps} of {totalSteps} steps &middot; {progressPercent}%
            </span>
          </div>

          <p className="text-sm font-medium leading-snug">
            Step {activeStep.step_number}: {activeStep.title}
          </p>

          {shownTasks.length > 0 && (
            <ul className="space-y-0.5">
              {shownTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Circle className="h-3 w-3 shrink-0" />
                  <span className="truncate">{task.title}</span>
                </li>
              ))}
              {hiddenTaskCount > 0 && (
                <li className="pl-[18px] text-xs text-muted-foreground">
                  +{hiddenTaskCount} more{" "}
                  {hiddenTaskCount === 1 ? "task" : "tasks"}
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Continue CTA */}
        <Button
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => onContinue(activeStep.phase as JourneyPhase)}
        >
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { NextStepWidget }
