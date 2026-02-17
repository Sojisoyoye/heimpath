/**
 * Dashboard Page Component
 * Centralized overview of user's journey, recent activity, and quick actions
 */

import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Clock,
  FileText,
  MapIcon,
  Plus,
  Upload,
} from "lucide-react"

import { cn } from "@/common/utils"
import { ProgressBar } from "@/components/Journey/ProgressBar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  ActivityItem,
  ActivityType,
  BookmarkedLawSummary,
  DashboardOverview,
  JourneyOverview,
  SavedCalculationSummary,
  SavedDocumentSummary,
} from "@/models/dashboard"

interface IProps {
  data: DashboardOverview | undefined
  isLoading: boolean
  userName: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const PHASE_LABELS: Record<string, string> = {
  research: "Research",
  preparation: "Preparation",
  buying: "Buying",
  closing: "Closing",
}

const PHASE_COLORS: Record<string, string> = {
  research: "bg-blue-100 text-blue-800",
  preparation: "bg-purple-100 text-purple-800",
  buying: "bg-orange-100 text-orange-800",
  closing: "bg-green-100 text-green-800",
}

const ACTIVITY_ICONS: Record<ActivityType, typeof FileText> = {
  journey_started: MapIcon,
  step_completed: ArrowRight,
  document_uploaded: Upload,
  calculation_saved: Calculator,
  roi_calculated: Calculator,
  financing_assessed: Calculator,
  law_bookmarked: BookOpen,
}

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  journey_started: "text-blue-600 bg-blue-50",
  step_completed: "text-green-600 bg-green-50",
  document_uploaded: "text-purple-600 bg-purple-50",
  calculation_saved: "text-orange-600 bg-orange-50",
  roi_calculated: "text-orange-600 bg-orange-50",
  financing_assessed: "text-orange-600 bg-orange-50",
  law_bookmarked: "text-indigo-600 bg-indigo-50",
}

const CALC_TYPE_LABELS: Record<string, string> = {
  hidden_costs: "Hidden Costs",
  roi: "ROI Analysis",
  financing: "Financing",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Dashboard header with greeting. */
function DashboardHeader(props: { userName: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Welcome back, {props.userName}
      </h1>
      <p className="text-muted-foreground">
        Here&apos;s an overview of your property journey progress.
      </p>
    </div>
  )
}

/** Journey progress card for active journey. */
function JourneyOverviewCard(props: { journey: JourneyOverview }) {
  const { journey } = props

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{journey.title}</CardTitle>
            <CardDescription>
              Step {journey.currentStepNumber} of {journey.totalSteps}
              {journey.estimatedDaysRemaining != null && (
                <span className="ml-2">
                  &middot; ~{journey.estimatedDaysRemaining} days remaining
                </span>
              )}
            </CardDescription>
          </div>
          <Badge
            variant="secondary"
            className={PHASE_COLORS[journey.currentPhase]}
          >
            {PHASE_LABELS[journey.currentPhase] ?? journey.currentPhase}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">
              {journey.completedSteps} / {journey.totalSteps} steps
            </span>
          </div>
          <ProgressBar value={journey.progressPercentage} showLabel size="md" />
        </div>

        {/* Phase progress indicators */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(journey.phases).map(([phase, counts]) => (
            <div key={phase} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">
                {PHASE_LABELS[phase] ?? phase}
              </div>
              <div className="text-sm font-medium">
                {counts.completed}/{counts.total}
              </div>
            </div>
          ))}
        </div>

        {journey.nextStepTitle && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm text-muted-foreground">Next step</p>
              <p className="text-sm font-medium">{journey.nextStepTitle}</p>
            </div>
            <Button size="sm" asChild>
              <Link
                to="/journeys/$journeyId"
                params={{ journeyId: journey.id }}
              >
                Continue
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** CTA card when user has no journey yet. */
function EmptyJourneyCard() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <MapIcon className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Start Your Property Journey</h3>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          Get a personalized step-by-step guide to buying property in Germany,
          tailored to your situation.
        </p>
        <Button asChild>
          <Link to="/journeys/new">
            <Plus className="mr-2 h-4 w-4" />
            Start Journey
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/** Quick action buttons grid. */
function QuickActions(props: { journeyId?: string }) {
  const actions = [
    {
      label: "Upload Document",
      icon: Upload,
      to: "/documents" as const,
      color: "text-purple-600",
    },
    {
      label: "Calculate Costs",
      icon: Calculator,
      to: "/calculators" as const,
      color: "text-orange-600",
    },
    {
      label: "Browse Laws",
      icon: BookOpen,
      to: "/laws" as const,
      color: "text-indigo-600",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            className="justify-start gap-3"
            asChild
          >
            <Link to={action.to}>
              <action.icon className={cn("h-4 w-4", action.color)} />
              {action.label}
            </Link>
          </Button>
        ))}
        {props.journeyId && (
          <Button variant="ghost" className="justify-start gap-3" asChild>
            <Link
              to="/journeys/$journeyId"
              params={{ journeyId: props.journeyId }}
            >
              <MapIcon className="h-4 w-4 text-blue-600" />
              Continue Journey
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/** Lists of recent saved items (documents, calculations, bookmarks). */
function SavedItemsSection(props: {
  documents: SavedDocumentSummary[]
  calculations: SavedCalculationSummary[]
  bookmarks: BookmarkedLawSummary[]
}) {
  const { documents, calculations, bookmarks } = props

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Recent Documents */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Documents</CardTitle>
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to="/documents">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No documents uploaded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-2 text-sm">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{doc.originalFilename}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recent Calculations */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Calculations</CardTitle>
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to="/calculators">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {calculations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No calculations saved yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {calculations.map((calc) => (
                <li
                  key={calc.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">
                    {calc.name ?? CALC_TYPE_LABELS[calc.calculatorType]}
                  </span>
                  <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                    {calc.headlineValue}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Bookmarked Laws */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Bookmarked Laws</CardTitle>
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to="/laws">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bookmarks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No laws bookmarked yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {bookmarks.map((law) => (
                <li key={law.id} className="text-sm">
                  <span className="font-medium">{law.citation}</span>
                  <span className="ml-1 text-muted-foreground">
                    {law.titleEn}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Vertical activity timeline. */
function ActivityTimeline(props: { activities: ActivityItem[] }) {
  const { activities } = props

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((item, idx) => {
            const Icon = ACTIVITY_ICONS[item.activityType] ?? Clock
            const colorClass =
              ACTIVITY_COLORS[item.activityType] ?? "text-gray-600 bg-gray-50"

            return (
              <div key={`${item.entityId}-${idx}`} className="flex gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    colorClass,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(item.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/** Usage stats summary row. */
function UsageStats(props: {
  docsThisMonth: number
  totalCalcs: number
  totalBookmarks: number
}) {
  const stats = [
    { label: "Docs this month", value: props.docsThisMonth },
    { label: "Total calculations", value: props.totalCalcs },
    { label: "Bookmarked laws", value: props.totalBookmarks },
  ]

  return (
    <Card>
      <CardContent className="grid grid-cols-3 gap-4 py-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** Loading skeleton for the dashboard. */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-2 h-8 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/** Default component. Main dashboard layout. */
function DashboardPage(props: IProps) {
  const { data, isLoading, userName } = props

  if (isLoading || !data) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      <DashboardHeader userName={userName} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: 2/3 width */}
        <div className="space-y-6 lg:col-span-2">
          {data.hasJourney && data.journey ? (
            <JourneyOverviewCard journey={data.journey} />
          ) : (
            <EmptyJourneyCard />
          )}

          <SavedItemsSection
            documents={data.recentDocuments}
            calculations={data.recentCalculations}
            bookmarks={data.bookmarkedLaws}
          />
        </div>

        {/* Right column: 1/3 width */}
        <div className="space-y-6">
          <QuickActions journeyId={data.journey?.id} />
          <ActivityTimeline activities={data.recentActivity} />
          <UsageStats
            docsThisMonth={data.documentsTranslatedThisMonth}
            totalCalcs={data.totalCalculations}
            totalBookmarks={data.totalBookmarks}
          />
        </div>
      </div>
    </div>
  )
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Format a timestamp string into a relative time label. */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

/******************************************************************************
                              Export
******************************************************************************/

export default DashboardPage
