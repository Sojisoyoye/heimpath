/**
 * Step Card Component
 * Collapsible journey step with status, dynamic content, and tasks
 */

import { Check, ChevronDown, ChevronRight, Circle, Clock } from "lucide-react"
import type { ReactNode } from "react"
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
import type {
  JourneyStep,
  JourneyTask,
  PropertyGoals,
  StepStatus,
} from "@/models/journey"
import { useJourneyContext } from "./JourneyContext"
import { ProgressBar } from "./ProgressBar"
import { MarketInsights } from "./StepContent/MarketInsights"
import { PropertyEvaluationSummary } from "./StepContent/PropertyEvaluationSummary"
import { PropertyGoalsForm } from "./StepContent/PropertyGoalsForm"
import { TaskCheckbox } from "./TaskCheckbox"

interface IProps {
  step: JourneyStep
  isActive?: boolean
  onTaskToggle?: (stepId: string, taskId: string, isCompleted: boolean) => void
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

interface IStepContentProps {
  journeyId: string
  step: JourneyStep
  propertyLocation?: string
  propertyType?: string
  budgetEuros?: number
  propertyGoals?: PropertyGoals
}

const STEP_CONTENT_REGISTRY: Record<
  string,
  (props: IStepContentProps) => ReactNode
> = {
  research_goals: (p) => (
    <PropertyGoalsForm journeyId={p.journeyId} initialGoals={p.propertyGoals} />
  ),
  market_research: (p) => (
    <MarketInsights
      propertyLocation={p.propertyLocation}
      propertyType={p.propertyType}
      budgetEuros={p.budgetEuros}
      propertyGoals={p.propertyGoals}
    />
  ),
  property_evaluation: (p) => (
    <PropertyEvaluationSummary journeyId={p.journeyId} stepId={p.step.id} />
  ),
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

/** Inline task list with progress for a step. */
function StepTasks(props: {
  tasks: JourneyTask[]
  stepId: string
  stepStatus: StepStatus
  onToggle?: (stepId: string, taskId: string, isCompleted: boolean) => void
}) {
  const { tasks, stepId, stepStatus, onToggle } = props

  const completedTasks = tasks.filter((t) => t.is_completed).length
  const totalTasks = tasks.length
  const progressPercent =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const isDisabled = stepStatus === "skipped"

  const handleToggle = (taskId: string, isCompleted: boolean) => {
    onToggle?.(stepId, taskId, isCompleted)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">Tasks</span>
          <span className="text-sm text-muted-foreground">
            {completedTasks} of {totalTasks}
          </span>
        </div>
        <ProgressBar value={progressPercent} size="sm" />
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCheckbox
            key={task.id}
            task={task}
            onToggle={handleToggle}
            disabled={isDisabled}
          />
        ))}
      </div>
    </div>
  )
}

/** Default component. Collapsible step card. */
function StepCard(props: IProps) {
  const { step, isActive = false, onTaskToggle, className } = props
  const { journey } = useJourneyContext()

  const [isExpanded, setIsExpanded] = useState(isActive)

  const contentRenderer = step.content_key
    ? STEP_CONTENT_REGISTRY[step.content_key]
    : undefined

  const hasTasks = step.tasks.length > 0
  const hasBody =
    !!contentRenderer || hasTasks || !!step.estimated_duration_days

  return (
    <Card
      className={cn(
        "transition-all",
        isActive && "ring-2 ring-blue-600 ring-offset-2",
        step.status === "completed" && "opacity-75",
        className,
      )}
    >
      <CardHeader
        className={cn("pb-3", hasBody && "cursor-pointer select-none")}
        onClick={() => hasBody && setIsExpanded((prev) => !prev)}
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
        <CardContent className="space-y-4 pt-0">
          {contentRenderer && (
            <div>
              {contentRenderer({
                journeyId: journey.id,
                step,
                propertyLocation: journey.property_location,
                propertyType: journey.property_type,
                budgetEuros: journey.budget_euros,
                propertyGoals: journey.property_goals,
              })}
            </div>
          )}

          {hasTasks && (
            <StepTasks
              tasks={step.tasks}
              stepId={step.id}
              stepStatus={step.status}
              onToggle={onTaskToggle}
            />
          )}

          {step.estimated_duration_days && (
            <p className="text-xs text-muted-foreground">
              Estimated duration: {step.estimated_duration_days} days
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StepCard }
