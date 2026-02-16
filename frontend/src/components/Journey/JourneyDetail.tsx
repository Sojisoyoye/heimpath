/**
 * Journey Detail Component
 * Full journey view with all steps and progress
 */

import { Link } from "@tanstack/react-router"
import { ArrowLeft, Calendar, Home, MapPin, Wallet } from "lucide-react"
import {
  FINANCING_TYPES,
  GERMAN_STATES,
  PROPERTY_TYPES,
} from "@/common/constants"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { JourneyProgress, JourneyPublic } from "@/models/journey"
import { PhaseIndicator } from "./PhaseIndicator"
import { ProgressBar } from "./ProgressBar"
import { StepCard } from "./StepCard"

interface IProps {
  journey: JourneyPublic
  progress?: JourneyProgress
  onTaskToggle: (stepId: string, taskId: string, isCompleted: boolean) => void
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Not set"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

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
                {formatCurrency(journey.budget_euros)}
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
    isLoading = false,
    className,
  } = props

  if (isLoading) {
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
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/journeys">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {propertyLabel} in {stateName}
          </h1>
          <p className="text-muted-foreground">
            Your personalized property buying journey
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-sm",
            journey.current_phase === "research" && "bg-blue-100 text-blue-800",
            journey.current_phase === "preparation" &&
              "bg-purple-100 text-purple-800",
            journey.current_phase === "buying" &&
              "bg-orange-100 text-orange-800",
            journey.current_phase === "closing" &&
              "bg-green-100 text-green-800",
          )}
        >
          {journey.current_phase.charAt(0).toUpperCase() +
            journey.current_phase.slice(1)}{" "}
          Phase
        </Badge>
      </div>

      {/* Phase indicator */}
      <PhaseIndicator
        currentPhase={journey.current_phase}
        className="rounded-lg border bg-card p-4"
      />

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Steps list */}
        <div className="lg:col-span-2 space-y-4">
          {journey.steps.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              journeyId={journey.id}
              onTaskToggle={onTaskToggle}
              isActive={step.step_number === journey.current_step_number}
              defaultExpanded={step.step_number === journey.current_step_number}
              propertyLocation={journey.property_location}
              propertyType={journey.property_type}
              budgetEuros={journey.budget_euros}
              propertyGoals={journey.property_goals}
            />
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <JourneyOverview journey={journey} progress={progress} />
        </div>
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { JourneyDetail }
