/**
 * Getting Started Checklist Component
 * Dashboard widget guiding new users through key first actions
 */

import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Circle,
  MapIcon,
  Upload,
} from "lucide-react"

import { cn } from "@/common/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardOverview } from "@/models/dashboard"

interface IProps {
  data: DashboardOverview
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

interface ChecklistItem {
  id: string
  label: string
  icon: typeof MapIcon
  to: string
  search?: Record<string, string>
}

const CHECKLIST_ITEMS: ReadonlyArray<ChecklistItem> = [
  {
    id: "journey",
    label: "Start a property journey",
    icon: MapIcon,
    to: "/journeys/new",
  },
  {
    id: "calculator",
    label: "Calculate hidden costs",
    icon: Calculator,
    to: "/calculators",
    search: { tab: "hidden-costs" },
  },
  {
    id: "document",
    label: "Upload a document",
    icon: Upload,
    to: "/documents",
  },
  {
    id: "laws",
    label: "Browse German property laws",
    icon: BookOpen,
    to: "/laws",
  },
]

/******************************************************************************
                              Functions
******************************************************************************/

function getCompletedItems(data: DashboardOverview): Set<string> {
  const completed = new Set<string>()
  if (data.hasJourney) completed.add("journey")
  if (data.totalCalculations > 0) completed.add("calculator")
  if (data.recentDocuments.length > 0) completed.add("document")
  if (data.totalBookmarks > 0) completed.add("laws")
  return completed
}

/******************************************************************************
                              Components
******************************************************************************/

/** Single checklist row. */
function ChecklistRow(
  props: Readonly<{
    item: ChecklistItem
    completed: boolean
  }>,
) {
  const { item, completed } = props
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      {...(item.search ? { search: item.search } : {})}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        completed ? "text-muted-foreground" : "hover:bg-muted/50",
      )}
    >
      {completed ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          completed ? "text-muted-foreground" : "text-foreground",
        )}
      />
      <span className={cn("flex-1 text-sm", completed && "line-through")}>
        {item.label}
      </span>
      {!completed && (
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </Link>
  )
}

/** Default component. Getting started checklist widget. */
function GettingStartedChecklist(props: Readonly<IProps>) {
  const { data, className } = props
  const completedItems = getCompletedItems(data)
  const completedCount = completedItems.size
  const totalCount = CHECKLIST_ITEMS.length
  const allComplete = completedCount >= totalCount

  if (allComplete) return null

  const progressPercent = Math.round((completedCount / totalCount) * 100)

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Getting Started</CardTitle>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
        <CardDescription>
          Complete these steps to get the most out of HeimPath
        </CardDescription>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-0.5 pt-0">
        {CHECKLIST_ITEMS.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            completed={completedItems.has(item.id)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { getCompletedItems, GettingStartedChecklist }
