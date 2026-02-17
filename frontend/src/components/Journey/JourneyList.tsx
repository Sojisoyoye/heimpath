/**
 * Journey List Component
 * Displays all user journeys with empty state
 */

import { Link } from "@tanstack/react-router"
import { Compass, Plus } from "lucide-react"

import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { JourneyPublic } from "@/models/journey"
import { JourneyCard } from "./JourneyCard"

interface IProps {
  journeys: JourneyPublic[]
  isLoading?: boolean
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Empty state when no journeys exist. */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
        <Compass className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">
        Start Your Property Journey
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Create your first property journey to get personalized guidance through
        the German real estate buying process.
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link to="/journeys/new">
          <Plus className="h-4 w-4" />
          Create Journey
        </Link>
      </Button>
    </div>
  )
}

/** Loading skeleton for journey cards. */
function JourneyCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full" />
      </div>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

/** Default component. List of journey cards. */
function JourneyList(props: IProps) {
  const { journeys, isLoading = false, className } = props

  if (isLoading) {
    return (
      <div
        className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <JourneyCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (journeys.length === 0) {
    return <EmptyState />
  }

  return (
    <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
      {journeys.map((journey) => (
        <JourneyCard key={journey.id} journey={journey} />
      ))}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { JourneyList }
