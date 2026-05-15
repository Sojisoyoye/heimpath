/**
 * Step Tab View Component
 * Phase tab bar filters the step list to one phase at a time.
 * Primary view for journey steps — supports deep-link and auto-advance.
 */

import { useEffect, useRef, useState } from "react"
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
  onAddToPortfolio?: () => void
  /** Pre-select a phase on mount (e.g. from ?phase= deep-link). */
  initialPhase?: JourneyPhase
}

/******************************************************************************
                              Components
******************************************************************************/

function StepTabView(props: IProps) {
  const {
    steps,
    activeStepNumber,
    onTaskToggle,
    onStepOpen,
    onAddToPortfolio,
    initialPhase,
  } = props

  const activeStep = steps.find((s) => s.step_number === activeStepNumber)
  const defaultPhase = initialPhase ?? activeStep?.phase ?? "research"

  const [selectedPhase, setSelectedPhase] = useState<JourneyPhase>(defaultPhase)

  // Track which step cards are expanded. Start with just the active step open.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    activeStep ? new Set([activeStep.id]) : new Set(),
  )

  const toggleStep = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  // Find the phase containing the first incomplete step that comes after
  // the current phase (by step_number). This ensures the CTA navigates to
  // the section with the user's actual next step, rather than the canonical
  // successor — which can differ for rent_out journeys where some phases
  // have lower step_numbers than earlier canonical phases.
  const currentPhaseOrder = JOURNEY_PHASES.findIndex(
    (p) => p.key === effectivePhase,
  )
  const phasesAfterCurrent = new Set(
    JOURNEY_PHASES.slice(currentPhaseOrder + 1).map((p) => p.key),
  )
  const nextPhaseByStepOrder = steps
    .filter(
      (s) =>
        phasesAfterCurrent.has(s.phase) &&
        s.status !== "completed" &&
        s.status !== "skipped",
    )
    .sort((a, b) => a.step_number - b.step_number)[0]?.phase as
    | JourneyPhase
    | undefined

  // Don't show the CTA if the next phase (by step order) has already started.
  const nextPhaseStarted = nextPhaseByStepOrder
    ? stepsByPhase[nextPhaseByStepOrder].some((s) => s.status !== "not_started")
    : false

  // Auto-advance to the next incomplete phase when the current one is fully
  // complete and the next phase hasn't started yet.
  useEffect(() => {
    if (isPhaseComplete && nextPhaseByStepOrder && !nextPhaseStarted) {
      setSelectedPhase(nextPhaseByStepOrder)
    }
  }, [isPhaseComplete, nextPhaseByStepOrder, nextPhaseStarted])

  // Scroll to the active step when the user switches phases.
  const activeCardRef = useRef<HTMLDivElement>(null)
  const isInitialPhaseMount = useRef(true)

  // biome-ignore lint/correctness/useExhaustiveDependencies: effectivePhase is the intentional trigger
  useEffect(() => {
    if (isInitialPhaseMount.current) {
      isInitialPhaseMount.current = false
      return
    }
    const timer = setTimeout(() => {
      activeCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    }, 50)
    return () => clearTimeout(timer)
  }, [effectivePhase])

  // Expand-all / collapse-all for the currently visible phase steps.
  const allExpanded =
    phaseSteps.length > 0 && phaseSteps.every((s) => expandedIds.has(s.id))

  const handleToggleAll = () => {
    if (allExpanded) {
      setExpandedIds((prev) => {
        const next = new Set(prev)
        for (const s of phaseSteps) next.delete(s.id)
        return next
      })
    } else {
      setExpandedIds((prev) => {
        const next = new Set(prev)
        for (const s of phaseSteps) next.add(s.id)
        return next
      })
    }
  }

  const handleContinueToPhase = (nextPhase: JourneyPhase) => {
    setSelectedPhase(nextPhase)
  }

  // Build nav items with per-phase completion stats for the tab bar.
  const navPhases = visiblePhases.map((p) => {
    const phaseStepsForNav = stepsByPhase[p.key as JourneyPhase]
    return {
      key: p.key,
      label: p.label,
      stepCount: phaseStepsForNav.length,
      completedSteps: phaseStepsForNav.filter(
        (s) => s.status === "completed" || s.status === "skipped",
      ).length,
    }
  })

  return (
    <div className="space-y-4">
      {/* Phase tab bar — click to filter steps */}
      <PhaseIconNav
        phases={navPhases}
        activePhase={effectivePhase}
        onPhaseClick={(key) => setSelectedPhase(key as JourneyPhase)}
      />

      {/* Expand / collapse all toggle */}
      {phaseSteps.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleToggleAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      )}

      {/* Steps for selected phase */}
      {phaseSteps.map((step) => {
        const isActiveStep = step.step_number === activeStepNumber
        return (
          <div key={step.id} ref={isActiveStep ? activeCardRef : undefined}>
            <StepCard
              step={step}
              isActive={isActiveStep}
              isExpanded={expandedIds.has(step.id)}
              onToggleExpanded={() => toggleStep(step.id)}
              showPhaseBadge={false}
              onTaskToggle={onTaskToggle}
              onStepOpen={onStepOpen}
            />
          </div>
        )
      })}

      {/* Phase completion CTA */}
      {isPhaseComplete && !nextPhaseStarted && (
        <PhaseCompletionCta
          currentPhase={effectivePhase}
          activePhaseKeys={visiblePhases.map((p) => p.key)}
          onContinue={handleContinueToPhase}
          nextPhaseKey={nextPhaseByStepOrder}
          onAddToPortfolio={onAddToPortfolio}
        />
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StepTabView }
