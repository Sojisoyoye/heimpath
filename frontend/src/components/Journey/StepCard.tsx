/**
 * Step Card Component
 * Collapsible journey step with status, dynamic content, and tasks
 */

import { Check, ChevronRight, Circle, Clock } from "lucide-react"
import { useState } from "react"

import { JOURNEY_PHASES, PHASE_COLORS } from "@/common/constants"
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
  showPhaseBadge?: boolean
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
          "border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

/** Default component. Collapsible step card. */
function StepCard(props: IProps) {
  const {
    step,
    isActive = false,
    showPhaseBadge = true,
    onTaskToggle,
    onStepOpen,
    className,
  } = props

  const [isExpanded, setIsExpanded] = useState(false)

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
        "gap-0 overflow-hidden py-0 transition-all",
        isActive && "ring-2 ring-primary ring-offset-2",
        step.status === "completed" &&
          "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20",
        className,
      )}
    >
      <CardHeader
        className={cn("px-4 py-3", hasBody && "cursor-pointer select-none")}
        onClick={handleToggleExpanded}
      >
        <div className="flex items-center gap-2">
          {hasBody && (
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
                isExpanded && "rotate-90",
              )}
            />
          )}
          {showPhaseBadge && (
            <Badge
              variant="outline"
              className={cn("shrink-0 text-xs", PHASE_COLORS[step.phase])}
            >
              {JOURNEY_PHASES.find((p) => p.key === step.phase)?.label ??
                step.phase}
            </Badge>
          )}
          <span className="shrink-0 text-xs text-muted-foreground">
            Step {step.step_number}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <CardTitle className="min-w-0 truncate text-sm" title={step.title}>
            {step.title}
          </CardTitle>
          <div className="ml-auto shrink-0">
            <StatusBadge status={step.status} />
          </div>
        </div>
        {isExpanded && step.description && (
          <CardDescription className="mt-1 pl-6">
            {step.description}
          </CardDescription>
        )}
      </CardHeader>

      {hasBody && (
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <CardContent className="pt-0">
              {isExpanded && (
                <StepBody
                  step={step}
                  onTaskToggle={onTaskToggle}
                  onStepOpen={onStepOpen}
                />
              )}
            </CardContent>
          </div>
        </div>
      )}
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StepCard }
