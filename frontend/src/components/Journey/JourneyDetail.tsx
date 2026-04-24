/**
 * Journey Detail Component
 * Full journey view with all steps and progress
 */

import { Link } from "@tanstack/react-router"
import { ArrowLeft, Calendar, Home, MapPin, Trash2, Wallet } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"
import {
  FINANCING_TYPES,
  GERMAN_STATES,
  JOURNEY_PHASES,
  PHASE_COLORS,
  PROPERTY_TYPES,
} from "@/common/constants"
import { cn, formatDate, formatEur } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  JourneyPhase,
  JourneyProgress,
  JourneyPublic,
  JourneyStep,
} from "@/models/journey"
import { JourneyCompletionCta } from "./JourneyCompletionCta"
import { JourneyProvider } from "./JourneyContext"
import { PhaseCompletionCta } from "./PhaseCompletionCta"
import { PhaseIconNav } from "./PhaseIconNav"
import { ProgressBar } from "./ProgressBar"
import { StepCard } from "./StepCard"
import { StepTabView } from "./StepTabView"
import { type ViewMode, ViewModeToggle } from "./ViewModeToggle"

interface IProps {
  journey?: JourneyPublic
  progress?: JourneyProgress
  onTaskToggle: (stepId: string, taskId: string, isCompleted: boolean) => void
  onStepOpen?: (stepId: string) => void
  onDelete?: () => void
  isLoading?: boolean
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Journey overview sidebar. */
function JourneyOverview(props: {
  journey: JourneyPublic
  progress?: JourneyProgress
}) {
  const { journey, progress } = props

  const stateName =
    GERMAN_STATES.find((s) => s.code === journey.property_location)?.name ||
    journey.property_location
  const propertyLabel =
    PROPERTY_TYPES.find((p) => p.value === journey.property_type)?.label ||
    journey.property_type
  const financingLabel =
    FINANCING_TYPES.find((f) => f.value === journey.financing_type)?.label ||
    journey.financing_type

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Journey Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Location:</span>
            <span className="font-medium">{stateName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Property:</span>
            <span className="font-medium">{propertyLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Financing:</span>
            <span className="font-medium">{financingLabel}</span>
          </div>
          {journey.budget_euros && (
            <div className="hidden items-start gap-2 text-sm sm:flex">
              <span className="text-muted-foreground">Budget:</span>
              <span className="font-medium">
                {formatEur(journey.budget_euros)}
              </span>
            </div>
          )}
        </div>

        <Separator className="hidden sm:block" />

        <div className="hidden space-y-3 sm:block">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Started:</span>
            <span className="font-medium">
              {formatDate(journey.started_at)}
            </span>
          </div>
          {journey.target_purchase_date && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Target:</span>
              <span className="font-medium">
                {formatDate(journey.target_purchase_date)}
              </span>
            </div>
          )}
          {progress?.estimated_days_remaining && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Est. remaining:</span>
              <span className="font-medium">
                {progress.estimated_days_remaining} days
              </span>
            </div>
          )}
        </div>

        <Separator className="hidden sm:block" />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {progress?.completed_steps ?? 0} /{" "}
              {progress?.total_steps ?? journey.steps.length} steps
            </span>
            <span className="font-medium">
              {Math.round(progress?.progress_percentage ?? 0)}%
            </span>
          </div>
          <ProgressBar value={progress?.progress_percentage ?? 0} size="md" />
        </div>
      </CardContent>
    </Card>
  )
}

/** Compact phase progress bar replacing the full phase stepper. */
function PhaseProgressBar(props: { journey: JourneyPublic }) {
  const { journey } = props

  const activePhases = useMemo(
    () =>
      JOURNEY_PHASES.filter((p) =>
        journey.steps.some((s) => s.phase === p.key),
      ),
    [journey.steps],
  )

  const currentIdx = activePhases.findIndex(
    (p) => p.key === journey.current_phase,
  )
  // Clamp to 0 so "Phase X of N" never shows "Phase 0" for an unknown phase.
  const displayIdx = currentIdx >= 0 ? currentIdx : 0
  const currentPhaseLabel =
    activePhases[displayIdx]?.label ?? journey.current_phase

  return (
    <div className="flex items-center gap-3">
      <p className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
        Phase {displayIdx + 1} of {activePhases.length}{" "}
        <span className="font-medium text-foreground">{currentPhaseLabel}</span>
      </p>
      <div className="flex w-32 shrink-0 gap-0.5">
        {activePhases.map((phase, i) => (
          <div
            key={phase.key}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= displayIdx ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  )
}

/** Loading skeleton for journey detail. */
function JourneyDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {["overview", "phase", "steps"].map((k) => (
            <Skeleton key={k} className="h-48 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )
}

/** List view with phase completion CTAs between phase groups. */
function StepListView(props: {
  steps: JourneyStep[]
  activeStepNumber: number
  onTaskToggle: (stepId: string, taskId: string, isCompleted: boolean) => void
  onStepOpen?: (stepId: string) => void
}) {
  const { steps, activeStepNumber, onTaskToggle, onStepOpen } = props
  const phaseRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const handleContinueToPhase = useCallback((nextPhase: JourneyPhase) => {
    phaseRefs.current[nextPhase]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [])

  // Group steps by phase in order
  const phaseGroups = useMemo(() => {
    const groups: { phase: JourneyPhase; steps: JourneyStep[] }[] = []
    for (const step of steps) {
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.phase === step.phase) {
        lastGroup.steps.push(step)
      } else {
        groups.push({ phase: step.phase, steps: [step] })
      }
    }
    return groups
  }, [steps])

  const activePhase =
    steps.find((s) => s.step_number === activeStepNumber)?.phase ??
    phaseGroups[0]?.phase ??
    "research"

  const navPhases = useMemo(() => {
    // Build a map of phase → total step count. If a phase appears in
    // non-consecutive groups (edge case from API ordering), counts are summed.
    const stepCountByPhase = new Map<string, number>()
    for (const g of phaseGroups) {
      stepCountByPhase.set(
        g.phase,
        (stepCountByPhase.get(g.phase) ?? 0) + g.steps.length,
      )
    }
    return JOURNEY_PHASES.filter((p) => stepCountByPhase.has(p.key)).map(
      (p) => ({
        key: p.key,
        label: p.label,
        stepCount: stepCountByPhase.get(p.key) ?? 0,
      }),
    )
  }, [phaseGroups])

  return (
    <div className="space-y-4">
      {/* Phase icon nav — click to scroll to that phase */}
      <PhaseIconNav
        phases={navPhases}
        activePhase={activePhase}
        onPhaseClick={(key) => handleContinueToPhase(key as JourneyPhase)}
      />

      {phaseGroups.map((group) => {
        const isComplete = group.steps.every(
          (s) => s.status === "completed" || s.status === "skipped",
        )
        const phaseLabel =
          JOURNEY_PHASES.find((p) => p.key === group.phase)?.label ??
          group.phase
        return (
          <div
            key={group.phase}
            ref={(el) => {
              phaseRefs.current[group.phase] = el
            }}
            className="space-y-2"
          >
            {/* Phase section header */}
            <div className="flex items-center gap-2 px-1 pt-2">
              <span
                className={cn(
                  "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold",
                  PHASE_COLORS[group.phase],
                )}
              >
                {phaseLabel}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {group.steps.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                isActive={step.step_number === activeStepNumber}
                showPhaseBadge={false}
                onTaskToggle={onTaskToggle}
                onStepOpen={onStepOpen}
              />
            ))}
            {isComplete && (
              <PhaseCompletionCta
                currentPhase={group.phase}
                activePhaseKeys={phaseGroups.map((g) => g.phase)}
                onContinue={handleContinueToPhase}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Default component. Full journey detail view. */
function JourneyDetail(props: IProps) {
  const {
    journey,
    progress,
    onTaskToggle,
    onStepOpen,
    onDelete,
    isLoading = false,
    className,
  } = props

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem("heimpath-journey-view-mode")
    return stored === "tab" ? "tab" : "list"
  })

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem("heimpath-journey-view-mode", mode)
  }

  const isOwnershipComplete = useMemo(() => {
    if (!journey) return false
    const ownershipSteps = journey.steps.filter((s) => s.phase === "ownership")
    return (
      ownershipSteps.length > 0 &&
      ownershipSteps.every(
        (s) => s.status === "completed" || s.status === "skipped",
      )
    )
  }, [journey])

  if (isLoading || !journey) {
    return <JourneyDetailSkeleton />
  }

  const stateName =
    GERMAN_STATES.find((s) => s.code === journey.property_location)?.name ||
    journey.property_location
  const propertyLabel =
    PROPERTY_TYPES.find((p) => p.value === journey.property_type)?.label?.split(
      " ",
    )[0] || journey.property_type

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="relative flex flex-col items-center sm:flex-row sm:items-start sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-0 shrink-0 sm:static"
          asChild
        >
          <Link to="/journeys">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <h1 className="text-xl font-bold sm:text-2xl">
              {propertyLabel} in {stateName}
            </h1>
            <div className="flex shrink-0 items-center gap-1">
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete journey"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Badge
                variant="secondary"
                className={cn(
                  "shrink-0 text-sm",
                  PHASE_COLORS[journey.current_phase],
                )}
              >
                {JOURNEY_PHASES.find((p) => p.key === journey.current_phase)
                  ?.label ?? journey.current_phase}{" "}
                Phase
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground sm:text-base">
            Your personalized property buying journey
          </p>
        </div>
      </div>

      {/* Phase progress + view toggle — single row */}
      <div className="flex items-center justify-between gap-3">
        <PhaseProgressBar journey={journey} />
        <ViewModeToggle viewMode={viewMode} onChange={handleViewModeChange} />
      </div>

      {/* Completion CTA */}
      {isOwnershipComplete && <JourneyCompletionCta journeyId={journey.id} />}

      {/* Main content */}
      <JourneyProvider journey={journey}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Steps */}
          <div className="lg:col-span-2 space-y-4">
            {viewMode === "list" ? (
              <StepListView
                steps={journey.steps}
                activeStepNumber={journey.current_step_number}
                onTaskToggle={onTaskToggle}
                onStepOpen={onStepOpen}
              />
            ) : (
              <StepTabView
                steps={journey.steps}
                activeStepNumber={journey.current_step_number}
                onTaskToggle={onTaskToggle}
                onStepOpen={onStepOpen}
              />
            )}
          </div>

          {/* Sidebar — comes after steps on mobile, natural order on desktop */}
          <div className="order-last lg:order-none space-y-6">
            <JourneyOverview journey={journey} progress={progress} />
          </div>
        </div>
      </JourneyProvider>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { JourneyDetail }
