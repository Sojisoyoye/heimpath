/**
 * Step Tab View Component
 * Phase icon buttons to filter steps, then lists matching steps as cards
 * Alternative to the list view for viewing journey steps
 */

import { useState } from "react"
import { JOURNEY_PHASES } from "@/common/constants"
import type { JourneyPhase, JourneyStep } from "@/models/journey"
import { PhaseCompletionCta } from "./PhaseCompletionCta"
import { PhaseIconNav } from "./PhaseIconNav"
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
    ownership: [],
    rental_setup: [],
    rental_search: [],
    rental_application: [],
    rental_contract: [],
    rental_move_in: [],
  }
  for (const step of steps) {
    stepsByPhase[step.phase].push(step)
  }

  const visiblePhases = JOURNEY_PHASES.filter(
    (phase) => stepsByPhase[phase.key as JourneyPhase].length > 0,
  )

  const effectivePhase = visiblePhases.some((p) => p.key === selectedPhase)
    ? selectedPhase
    : ((visiblePhases[0]?.key ?? "research") as JourneyPhase)

  const phaseSteps = stepsByPhase[effectivePhase]

  const isPhaseComplete =
    phaseSteps.length > 0 &&
    phaseSteps.every((s) => s.status === "completed" || s.status === "skipped")

  const handleContinueToPhase = (nextPhase: JourneyPhase) => {
    setSelectedPhase(nextPhase)
  }

  return (
    <div className="space-y-4">
      {/* Phase icon buttons */}
      <PhaseIconNav
        phases={visiblePhases.map((p) => ({
          key: p.key,
          label: p.label,
          stepCount: stepsByPhase[p.key as JourneyPhase].length,
        }))}
        activePhase={effectivePhase}
        onPhaseClick={(key) => setSelectedPhase(key as JourneyPhase)}
      />

      {/* Steps for selected phase */}
      {phaseSteps.map((step) => (
        <StepCard
          key={step.id}
          step={step}
          isActive={step.step_number === activeStepNumber}
          showPhaseBadge={false}
          onTaskToggle={onTaskToggle}
          onStepOpen={onStepOpen}
        />
      ))}

      {/* Phase completion CTA */}
      {isPhaseComplete && (
        <PhaseCompletionCta
          currentPhase={effectivePhase}
          activePhaseKeys={visiblePhases.map((p) => p.key)}
          onContinue={handleContinueToPhase}
        />
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StepTabView }
