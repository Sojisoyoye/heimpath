/**
 * Step Card Component
 * Displays a journey step with tasks and status
 */

import { ChevronDown, ChevronRight, Check, Clock, Circle } from "lucide-react"
import { useState } from "react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TaskCheckbox } from "./TaskCheckbox"
import { ProgressBar } from "./ProgressBar"
import type { JourneyStep, StepStatus } from "@/models/journey"

interface IProps {
  step: JourneyStep
  onTaskToggle: (stepId: string, taskId: string, isCompleted: boolean) => void
  isActive?: boolean
  defaultExpanded?: boolean
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const STATUS_CONFIG: Record<
  StepStatus,
  { label: string; icon: typeof Check; variant: "default" | "secondary" | "outline" }
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

const PHASE_COLORS: Record<string, string> = {
  research: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  preparation: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  buying: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  closing: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
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
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

/** Default component. Step card with expandable task list. */
function StepCard(props: IProps) {
  const {
    step,
    onTaskToggle,
    isActive = false,
    defaultExpanded = false,
    className,
  } = props

  const [isExpanded, setIsExpanded] = useState(defaultExpanded || isActive)

  const completedTasks = step.tasks.filter((t) => t.isCompleted).length
  const totalTasks = step.tasks.length
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const handleTaskToggle = (taskId: string, isCompleted: boolean) => {
    onTaskToggle(step.id, taskId, isCompleted)
  }

  return (
    <Card
      className={cn(
        "transition-all",
        isActive && "ring-2 ring-blue-600 ring-offset-2",
        step.status === "completed" && "opacity-75",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-xs", PHASE_COLORS[step.phase])}
              >
                {step.phase.charAt(0).toUpperCase() + step.phase.slice(1)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Step {step.stepNumber}
              </span>
            </div>
            <CardTitle className="text-lg">{step.title}</CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </div>
          <StatusBadge status={step.status} />
        </div>

        {totalTasks > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completedTasks} of {totalTasks} tasks completed
              </span>
              <span className="font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <ProgressBar value={progressPercent} size="sm" />
          </div>
        )}
      </CardHeader>

      {totalTasks > 0 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mx-4 mb-2 w-fit gap-1 text-muted-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {isExpanded ? "Hide tasks" : "Show tasks"}
          </Button>

          {isExpanded && (
            <CardContent className="pt-0">
              <div className="space-y-2">
                {step.tasks.map((task) => (
                  <TaskCheckbox
                    key={task.id}
                    task={task}
                    onToggle={handleTaskToggle}
                    disabled={step.status === "completed" || step.status === "skipped"}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </>
      )}

      {step.estimatedDuration && (
        <div className="px-6 pb-4">
          <p className="text-xs text-muted-foreground">
            Estimated duration: {step.estimatedDuration}
          </p>
        </div>
      )}
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StepCard }
