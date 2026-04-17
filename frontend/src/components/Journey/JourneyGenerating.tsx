/**
 * Journey Generating Component
 * Post-wizard screen showing generation animation and completion summary
 */

import { CheckCircle2, Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { JourneyPhase, JourneyPublic } from "@/models/journey"
import { ProgressBar } from "./ProgressBar"

interface IProps {
  journey: JourneyPublic
  phase: "generating" | "complete"
  onViewJourney: () => void
}

/******************************************************************************
                              Constants
******************************************************************************/

const SUBTITLE_MESSAGES = [
  "Analyzing your profile...",
  "Personalizing steps...",
  "Preparing your journey...",
]

const SUBTITLE_INTERVAL_MS = 700

const PHASE_LABELS: Record<JourneyPhase, string> = {
  research: "Research",
  preparation: "Preparation",
  buying: "Buying",
  closing: "Closing",
  rental_setup: "Rental Setup",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Post-wizard generation and completion screen. */
function JourneyGenerating(props: IProps) {
  const { journey, phase, onViewJourney } = props
  const [subtitleIndex, setSubtitleIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  // Cycle subtitle messages during generating phase
  useEffect(() => {
    if (phase !== "generating") return
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % SUBTITLE_MESSAGES.length)
    }, SUBTITLE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [phase])

  // Animate progress bar during generating phase
  useEffect(() => {
    if (phase !== "generating") {
      setProgress(100)
      return
    }
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 5, 90))
    }, 100)
    return () => clearInterval(interval)
  }, [phase])

  // Count steps per phase
  const phaseCounts = useMemo(() => {
    const counts: Record<JourneyPhase, number> = {
      research: 0,
      preparation: 0,
      buying: 0,
      closing: 0,
      rental_setup: 0,
    }
    for (const step of journey.steps) {
      counts[step.phase]++
    }
    return counts
  }, [journey.steps])

  if (phase === "generating") {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-16">
        <Sparkles className="h-12 w-12 text-blue-500 animate-pulse" />
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">
            Generating your personalized journey...
          </h2>
          <p className="text-muted-foreground">
            {SUBTITLE_MESSAGES[subtitleIndex]}
          </p>
        </div>
        <ProgressBar value={progress} size="sm" className="max-w-xs" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-16">
      <CheckCircle2 className="h-12 w-12 text-green-500" />
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Your journey is ready!</h2>
        <p className="text-muted-foreground">
          {journey.steps.length}-step guide tailored to your profile
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.entries(PHASE_LABELS) as [JourneyPhase, string][])
          .filter(([phaseKey]) => phaseCounts[phaseKey] > 0)
          .map(([phaseKey, label]) => (
            <Card key={phaseKey} className="text-center">
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{phaseCounts[phaseKey]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
      </div>

      <Button size="lg" onClick={onViewJourney}>
        View My Journey
      </Button>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { JourneyGenerating }
