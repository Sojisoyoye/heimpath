/**
 * Phase Completion CTA
 * Shows a "Continue to Next Phase" prompt when all steps in a phase are complete,
 * or a "Journey Complete" message on the last phase.
 */

import { ArrowRight, CheckCircle2, PartyPopper } from "lucide-react"

import { JOURNEY_PHASES } from "@/common/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { JourneyPhase } from "@/models/journey"

interface IProps {
  currentPhase: JourneyPhase
  /** Keys of phases that have steps in this journey (determines next-phase target). */
  activePhaseKeys: string[]
  onContinue: (nextPhase: JourneyPhase) => void
  /**
   * Override the canonical next phase. When provided, this phase is used as
   * the navigation target instead of the canonical JOURNEY_PHASES successor.
   * Use this to navigate to the phase containing the first incomplete step
   * (by step_number), which may differ from the canonical order for journeys
   * where steps span phases non-sequentially (e.g. rent_out investors).
   */
  nextPhaseKey?: JourneyPhase
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Phase completion CTA card. */
function PhaseCompletionCta(props: Readonly<IProps>) {
  const { currentPhase, activePhaseKeys, onContinue, nextPhaseKey } = props

  // Only consider phases that actually have steps in this journey, preserving
  // canonical JOURNEY_PHASES order.
  const visiblePhases = JOURNEY_PHASES.filter((p) =>
    activePhaseKeys.includes(p.key),
  )

  const phaseIndex = visiblePhases.findIndex((p) => p.key === currentPhase)
  const canonicalIsLast =
    phaseIndex === -1 || phaseIndex === visiblePhases.length - 1
  const canonicalNext = canonicalIsLast ? null : visiblePhases[phaseIndex + 1]

  // Use the explicit override if provided, otherwise fall back to the canonical
  // successor. The override ensures users navigate to the section that actually
  // contains their next incomplete step, rather than the canonical next phase
  // (which can differ when steps span phases non-sequentially).
  const nextPhase = nextPhaseKey
    ? (visiblePhases.find((p) => p.key === nextPhaseKey) ?? canonicalNext)
    : canonicalNext
  const isLastPhase = nextPhase === null

  const currentLabel = visiblePhases[phaseIndex]?.label ?? currentPhase

  if (isLastPhase) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
        <CardContent className="flex flex-col items-center gap-3 py-5 text-center sm:flex-row sm:text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
            <PartyPopper className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              All phases complete!
            </h3>
            <p className="mt-0.5 text-sm text-green-700 dark:text-green-300">
              Congratulations — you've completed every phase of your property
              journey.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
      <CardContent className="flex flex-col items-center gap-3 py-5 text-center sm:flex-row sm:text-left">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
          <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            {currentLabel} phase complete!
          </h3>
          <p className="mt-0.5 text-sm text-blue-700 dark:text-blue-300">
            Great progress — ready to move on to the {nextPhase?.label} phase?
          </p>
        </div>
        <Button
          className="shrink-0 gap-2"
          onClick={() => onContinue(nextPhase!.key as JourneyPhase)}
        >
          Continue to {nextPhase?.label}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PhaseCompletionCta }
