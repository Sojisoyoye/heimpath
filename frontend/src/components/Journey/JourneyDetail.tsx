/**
 * Journey Detail Component
 * Full journey view with all steps and progress
 */

import { Link } from "@tanstack/react-router"
import { ArrowLeft, Calendar, Home, MapPin, Trash2, Wallet } from "lucide-react"
import { useState } from "react"
import {
  FINANCING_TYPES,
  GERMAN_STATES,
  PHASE_COLORS,
  PROPERTY_TYPES,
} from "@/common/constants"
import { cn, formatDate, formatEur } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { JourneyProgress, JourneyPublic } from "@/models/journey"
import { JourneyProvider } from "./JourneyContext"
import { PhaseIndicator } from "./PhaseIndicator"
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
            <div className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground">Budget:</span>
              <span className="font-medium">
                {formatEur(journey.budget_euros)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
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

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">
              {progress?.completed_steps ?? 0} /{" "}
              {progress?.total_steps ?? journey.steps.length} steps
            </span>
          </div>
          <ProgressBar
            value={progress?.progress_percentage ?? 0}
            showLabel
            size="md"
          />
        </div>
      </CardContent>
    </Card>
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
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
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
      <div className="flex items-start gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link to="/journeys">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
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
                {journey.current_phase.charAt(0).toUpperCase() +
                  journey.current_phase.slice(1)}{" "}
                Phase
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground sm:text-base">
            Your personalized property buying journey
          </p>
        </div>
      </div>

      {/* Phase indicator + view toggle */}
      <div className="flex items-center gap-3">
        <PhaseIndicator
          currentPhase={journey.current_phase}
          className="flex-1 rounded-lg border bg-card p-4"
        />
        <ViewModeToggle viewMode={viewMode} onChange={handleViewModeChange} />
      </div>

      {/* Main content */}
      <JourneyProvider journey={journey}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Steps */}
          <div className="lg:col-span-2 space-y-4">
            {viewMode === "list" ? (
              journey.steps.map((step) => (
                <StepCard
                  key={step.id}
                  step={step}
                  isActive={step.step_number === journey.current_step_number}
                  onTaskToggle={onTaskToggle}
                  onStepOpen={onStepOpen}
                />
              ))
            ) : (
              <StepTabView
                steps={journey.steps}
                activeStepNumber={journey.current_step_number}
                onTaskToggle={onTaskToggle}
                onStepOpen={onStepOpen}
              />
            )}
          </div>

          {/* Sidebar — comes first on mobile via order-first, natural order on desktop */}
          <div className="order-first lg:order-none space-y-6">
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
