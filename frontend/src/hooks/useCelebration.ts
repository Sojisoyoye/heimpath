/**
 * useCelebration
 * Detects when a journey phase becomes fully completed/skipped
 * and fires confetti + a success toast.
 */

import { useEffect, useRef } from "react"
import { toast } from "sonner"

import { JOURNEY_PHASES } from "@/common/constants"
import type { JourneyPhase, JourneyStep } from "@/models/journey"

/** Check which phases have all steps completed or skipped. */
function getCompletedPhases(steps: JourneyStep[]): Set<JourneyPhase> {
  const byPhase = new Map<JourneyPhase, JourneyStep[]>()

  for (const step of steps) {
    const list = byPhase.get(step.phase) ?? []
    list.push(step)
    byPhase.set(step.phase, list)
  }

  const completed = new Set<JourneyPhase>()
  for (const [phase, phaseSteps] of byPhase) {
    if (
      phaseSteps.every(
        (s) => s.status === "completed" || s.status === "skipped",
      )
    ) {
      completed.add(phase)
    }
  }

  return completed
}

function useCelebration(steps: JourneyStep[]) {
  const prevCompleted = useRef<Set<JourneyPhase> | null>(null)

  useEffect(() => {
    if (steps.length === 0) return

    const current = getCompletedPhases(steps)

    // First render — populate snapshot without celebrating
    if (prevCompleted.current === null) {
      prevCompleted.current = current
      return
    }

    // Detect newly completed phases
    for (const phase of current) {
      if (prevCompleted.current.has(phase)) continue

      const label = JOURNEY_PHASES.find((p) => p.key === phase)?.label ?? phase
      toast.success(`${label} Phase Complete!`)

      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches

      if (!prefersReduced) {
        import("canvas-confetti")
          .then((mod) => {
            const confetti = mod.default
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            })
          })
          .catch(() => {})
      }
    }

    prevCompleted.current = current
  }, [steps])
}

export { useCelebration }
