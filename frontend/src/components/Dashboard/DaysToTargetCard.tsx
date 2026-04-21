/**
 * Days-to-Target Countdown Card
 * Shows days remaining until the user's target purchase date
 */

import { Link } from "@tanstack/react-router"
import { ArrowRight, CalendarClock } from "lucide-react"

import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface IProps {
  daysToTarget: number | null
  targetPurchaseDate: string | null
  journeyId: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const MILESTONES: { maxDays: number; message: string }[] = [
  { maxDays: 0, message: "Today is the day — good luck!" },
  { maxDays: 14, message: "Final stretch — check all documents are ready" },
  { maxDays: 30, message: "Time to confirm notary appointment" },
  { maxDays: 60, message: "Schedule your notary appointment soon" },
  { maxDays: 90, message: "Start finalising your mortgage offer" },
  { maxDays: 180, message: "Good pace — keep progressing on your steps" },
]

/******************************************************************************
                              Components
******************************************************************************/

/** CTA when no target date is set. */
function SetDateCta(props: Readonly<{ journeyId: string }>) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Target Date</CardTitle>
        <CardDescription>
          Set a target closing date to track your timeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link
            to="/journeys/$journeyId"
            params={{ journeyId: props.journeyId }}
          >
            Set Target Date
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/** Default component. Countdown card for the dashboard. */
function DaysToTargetCard(props: Readonly<IProps>) {
  const { daysToTarget, targetPurchaseDate, journeyId } = props

  if (daysToTarget == null || targetPurchaseDate == null) {
    return <SetDateCta journeyId={journeyId} />
  }

  const milestone = MILESTONES.find((m) => daysToTarget <= m.maxDays)
  const dateLabel = DATE_FMT.format(new Date(targetPurchaseDate))

  const urgencyColor =
    daysToTarget <= 30
      ? "text-red-600 dark:text-red-400"
      : daysToTarget <= 90
        ? "text-amber-600 dark:text-amber-400"
        : "text-blue-600 dark:text-blue-400"

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Target Date</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-center">
        <p className={cn("text-4xl font-bold tabular-nums", urgencyColor)}>
          {daysToTarget}
        </p>
        <p className="text-sm text-muted-foreground">days until {dateLabel}</p>
        {milestone && (
          <p className="text-xs text-muted-foreground italic">
            {milestone.message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default DaysToTargetCard
