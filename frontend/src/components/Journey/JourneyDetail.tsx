/**
 * Journey Detail Component
 * Full journey view with all steps and progress
 */

import { Link } from "@tanstack/react-router"
import { ArrowLeft, Calendar, MapPin, Home, Wallet } from "lucide-react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { PhaseIndicator } from "./PhaseIndicator"
import { ProgressBar } from "./ProgressBar"
import { StepCard } from "./StepCard"
import { GERMAN_STATES, PROPERTY_TYPES, FINANCING_TYPES } from "@/common/constants"
import type { JourneyPublic, JourneyProgress, JourneyPhase } from "@/models/journey"

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
    GERMAN_STATES.find((s) => s.code === journey.targetState)?.name ||
    journey.targetState
  const propertyLabel =
    PROPERTY_TYPES.find((p) => p.value === journey.propertyType)?.label ||
    journey.propertyType
  const financingLabel =
    FINANCING_TYPES.find((f) => f.value === journey.financingType)?.label ||
    journey.financingType

  const formatDate = (dateStr: string) => {
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
          {journey.budgetMin && journey.budgetMax && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground">Budget:</span>
              <span className="font-medium">
                {formatCurrency(journey.budgetMin)} - {formatCurrency(journey.budgetMax)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Started:</span>
            <span className="font-medium">{formatDate(journey.startedAt)}</span>
          </div>
          {journey.targetDate && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Target:</span>
              <span className="font-medium">{formatDate(journey.targetDate)}</span>
            </div>
          )}
          {progress?.estimatedDaysRemaining && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Est. remaining:</span>
              <span className="font-medium">
                {progress.estimatedDaysRemaining} days
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">
              {progress?.completedSteps ?? 0} / {progress?.totalSteps ?? journey.steps.length} steps
            </span>
          </div>
          <ProgressBar
            value={progress?.percentComplete ?? 0}
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
  const { journey, progress, onTaskToggle, isLoading = false, className } = props

  if (isLoading) {
    return <JourneyDetailSkeleton />
  }

  const stateName =
    GERMAN_STATES.find((s) => s.code === journey.targetState)?.name ||
    journey.targetState
  const propertyLabel =
    PROPERTY_TYPES.find((p) => p.value === journey.propertyType)?.label.split(" ")[0] ||
    journey.propertyType

  // Group steps by phase
  const stepsByPhase = journey.steps.reduce(
    (acc, step) => {
      if (!acc[step.phase]) {
        acc[step.phase] = []
      }
      acc[step.phase].push(step)
      return acc
    },
    {} as Record<JourneyPhase, typeof journey.steps>
  )

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
            journey.currentPhase === "research" && "bg-blue-100 text-blue-800",
            journey.currentPhase === "preparation" && "bg-purple-100 text-purple-800",
            journey.currentPhase === "buying" && "bg-orange-100 text-orange-800",
            journey.currentPhase === "closing" && "bg-green-100 text-green-800"
          )}
        >
          {journey.currentPhase.charAt(0).toUpperCase() + journey.currentPhase.slice(1)} Phase
        </Badge>
      </div>

      {/* Phase indicator */}
      <PhaseIndicator
        currentPhase={journey.currentPhase}
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
              onTaskToggle={onTaskToggle}
              isActive={step.stepNumber === journey.currentStepNumber}
              defaultExpanded={step.stepNumber === journey.currentStepNumber}
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
