/**
 * Step Tab View Component
 * Phase pills to filter steps, then lists matching steps as cards
 * Alternative to the list view for viewing journey steps
 */

import { useState } from "react"

import { JOURNEY_PHASES, PHASE_COLORS } from "@/common/constants"
import { cn } from "@/common/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { JourneyPhase, JourneyStep } from "@/models/journey"
import { StepCard } from "./StepCard"

interface IProps {
  steps: JourneyStep[]
  activeStepNumber: number
  onTaskToggle: (stepId: string, taskId: string, isCompleted: boolean) => void
  onStepOpen?: (stepId: string) => void
}

/******************************************************************************
                              Components
******************************************************************************/

function StepTabView(props: IProps) {
  const { steps, activeStepNumber, onTaskToggle, onStepOpen } = props

  const activeStep = steps.find((s) => s.step_number === activeStepNumber)
  const defaultPhase = activeStep?.phase ?? "research"

  const [selectedPhase, setSelectedPhase] = useState<JourneyPhase>(defaultPhase)

  const stepsByPhase: Record<JourneyPhase, JourneyStep[]> = {
    research: [],
    preparation: [],
    buying: [],
    closing: [],
    rental_setup: [],
  }
  for (const step of steps) {
    stepsByPhase[step.phase].push(step)
  }

  const phaseSteps = stepsByPhase[selectedPhase]

  return (
    <div className="space-y-4">
      {/* Phase pills */}
      <Tabs
        value={selectedPhase}
        onValueChange={(v) => setSelectedPhase(v as JourneyPhase)}
      >
        <TabsList className="flex w-full flex-wrap gap-1">
          {JOURNEY_PHASES.filter(
            (phase) => stepsByPhase[phase.key as JourneyPhase].length > 0,
          ).map((phase) => (
            <TabsTrigger
              key={phase.key}
              value={phase.key}
              className={cn(
                "text-xs sm:text-sm",
                selectedPhase === phase.key && PHASE_COLORS[phase.key],
              )}
            >
              {phase.label}
              <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">
                ({stepsByPhase[phase.key as JourneyPhase].length})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Steps for selected phase */}
      {phaseSteps.map((step) => (
        <StepCard
          key={step.id}
          step={step}
          isActive={step.step_number === activeStepNumber}
          onTaskToggle={onTaskToggle}
          onStepOpen={onStepOpen}
        />
      ))}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StepTabView }
