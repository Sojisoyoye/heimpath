/**
 * Step Card Component
 * Collapsible journey step with status, dynamic content, and tasks
 */

import { Check, ChevronDown, ChevronRight, Circle, Clock } from "lucide-react"
import { useState } from "react"

import { PHASE_COLORS } from "@/common/constants"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { JourneyStep, StepStatus } from "@/models/journey"
import { STEP_CONTENT_REGISTRY, StepBody } from "./StepContent/StepBody"

interface IProps {
  step: JourneyStep
  isActive?: boolean
  onTaskToggle?: (stepId: string, taskId: string, isCompleted: boolean) => void
  onStepOpen?: (stepId: string) => void
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const STATUS_CONFIG: Record<
  StepStatus,
  {
    label: string
    icon: typeof Check
    variant: "default" | "secondary" | "outline"
  }
> = {
  not_started: {
    label: "Not Started",
    icon: Circle,
    variant: "outline",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    variant: "default",
  },
  completed: {
    label: "Completed",
    icon: Check,
    variant: "secondary",
  },
  skipped: {
    label: "Skipped",
    icon: Circle,
    variant: "outline",
  },
}

/******************************************************************************
                              Components
******************************************************************************/

/** Step status badge. */
function StatusBadge(props: { status: StepStatus }) {
  const { status } = props
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "gap-1",
        status === "completed" &&
          "border border-green-200 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400",
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

/** Default component. Collapsible step card. */
function StepCard(props: IProps) {
  const { step, isActive = false, onTaskToggle, onStepOpen, className } = props

  const [isExpanded, setIsExpanded] = useState(isActive)

  const hasContentRenderer = step.content_key
    ? !!STEP_CONTENT_REGISTRY[step.content_key]
    : false

  const hasTasks = step.tasks.length > 0
  const hasBody =
    hasContentRenderer || hasTasks || !!step.estimated_duration_days

  const handleToggleExpanded = () => {
    if (!hasBody) return
    setIsExpanded(!isExpanded)
  }

  return (
    <Card
      className={cn(
        "transition-all",
        isActive && "ring-2 ring-blue-600 ring-offset-2",
        step.status === "completed" &&
          "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20",
        className,
      )}
    >
      <CardHeader
        className={cn("pb-3", hasBody && "cursor-pointer select-none")}
        onClick={handleToggleExpanded}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              {hasBody &&
                (isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                ))}
              <Badge
                variant="outline"
                className={cn("text-xs", PHASE_COLORS[step.phase])}
              >
                {step.phase.charAt(0).toUpperCase() + step.phase.slice(1)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Step {step.step_number}
              </span>
            </div>
            <CardTitle className="text-base sm:text-lg">{step.title}</CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </div>
          <div className="self-start">
            <StatusBadge status={step.status} />
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <StepBody
            step={step}
            onTaskToggle={onTaskToggle}
            onStepOpen={onStepOpen}
          />
        </CardContent>
      )}
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StepCard }
