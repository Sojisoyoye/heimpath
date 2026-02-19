/**
 * Journey Card Component
 * Summary card for a journey in list view
 */

import { Link } from "@tanstack/react-router"
import { ArrowRight, Calendar, Home, MapPin } from "lucide-react"
import { GERMAN_STATES, PHASE_COLORS, PROPERTY_TYPES } from "@/common/constants"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { JourneyProgress, JourneyPublic } from "@/models/journey"
import { ProgressBar } from "./ProgressBar"

interface IProps {
  journey: JourneyPublic
  progress?: JourneyProgress
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Journey summary card. */
function JourneyCard(props: IProps) {
  const { journey, progress, className } = props

  const stateName =
    GERMAN_STATES.find((s) => s.code === journey.property_location)?.name ||
    journey.property_location
  const propertyLabel =
    PROPERTY_TYPES.find((p) => p.value === journey.property_type)?.label ||
    journey.property_type

  const completedSteps = progress?.completed_steps ?? 0
  const totalSteps = progress?.total_steps ?? journey.steps.length
  const percentComplete = progress?.progress_percentage ?? 0

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Not set"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <Card className={cn("transition-all hover:shadow-md", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-lg sm:text-xl">
              {propertyLabel?.split(" ")[0]} in {stateName}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {stateName}
              </span>
              <span className="flex items-center gap-1">
                <Home className="h-3.5 w-3.5 shrink-0" />
                {propertyLabel?.split(" ")[0]}
              </span>
            </CardDescription>
          </div>
          <Badge
            variant="secondary"
            className={cn("shrink-0", PHASE_COLORS[journey.current_phase])}
          >
            {journey.current_phase.charAt(0).toUpperCase() +
              journey.current_phase.slice(1)}{" "}
            Phase
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Journey Progress</span>
            <span className="font-medium">
              {completedSteps} of {totalSteps} steps
            </span>
          </div>
          <ProgressBar value={percentComplete} size="md" />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Started {formatDate(journey.started_at)}
          </span>
          {journey.target_purchase_date && (
            <span className="flex items-center gap-1">
              Target: {formatDate(journey.target_purchase_date)}
            </span>
          )}
        </div>

        {journey.budget_euros && (
          <div className="text-sm">
            <span className="text-muted-foreground">Budget: </span>
            <span className="font-medium">
              {new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(journey.budget_euros)}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild className="w-full gap-2">
          <Link to="/journeys/$journeyId" params={{ journeyId: journey.id }}>
            Continue Journey
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { JourneyCard }
