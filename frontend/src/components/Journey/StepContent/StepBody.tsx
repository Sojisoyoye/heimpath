/**
 * Step Body Component
 * Reusable step content renderer (content registry + tasks + duration)
 * Used by both StepCard (list view) and StepTabView (tab view)
 */

import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

import type {
  JourneyStep,
  JourneyTask,
  MarketInsightsData,
  PropertyGoals,
  StepStatus,
} from "@/models/journey"
import { useJourneyContext } from "../JourneyContext"
import { ProgressBar } from "../ProgressBar"
import { TaskCheckbox } from "../TaskCheckbox"
import { MarketInsights } from "./MarketInsights"
import { OwnershipInsurance } from "./OwnershipInsurance"
import { OwnershipManagement } from "./OwnershipManagement"
import { OwnershipRegistration } from "./OwnershipRegistration"
import { OwnershipTaxFinance } from "./OwnershipTaxFinance"
import { PropertyEvaluationSummary } from "./PropertyEvaluationSummary"
import { PropertyGoalsForm } from "./PropertyGoalsForm"
import { RentalApplicationGuide } from "./RentalApplicationGuide"
import { RentalContractReview } from "./RentalContractReview"
import { RentalLandlordLaw } from "./RentalLandlordLaw"
import { RentalMoveInGuide } from "./RentalMoveInGuide"
import { RentalOperationsSetup } from "./RentalOperationsSetup"
import { RentalPropertyManagement } from "./RentalPropertyManagement"
import { RentalSearchGuide } from "./RentalSearchGuide"
import { RentalTaxStrategy } from "./RentalTaxStrategy"
import { RentalYieldAnalysis } from "./RentalYieldAnalysis"
import { StepDocumentReview } from "./StepDocumentReview"

interface IProps {
  step: JourneyStep
  onTaskToggle?: (stepId: string, taskId: string, isCompleted: boolean) => void
  onStepOpen?: (stepId: string) => void
}

/******************************************************************************
                              Constants
******************************************************************************/

interface IStepContentProps {
  journeyId: string
  step: JourneyStep
  propertyLocation?: string
  propertyType?: string
  budgetEuros?: number
  propertyGoals?: PropertyGoals
  marketInsights?: MarketInsightsData
}

const STEP_CONTENT_REGISTRY: Record<
  string,
  (props: IStepContentProps) => ReactNode
> = {
  research_goals: (p) => (
    <PropertyGoalsForm
      journeyId={p.journeyId}
      initialGoals={p.propertyGoals}
      propertyLocation={p.propertyLocation}
    />
  ),
  market_research: (p) => (
    <MarketInsights
      propertyLocation={p.propertyLocation}
      propertyType={p.propertyType}
      budgetEuros={p.budgetEuros}
      propertyGoals={p.propertyGoals}
      marketInsights={p.marketInsights}
    />
  ),
  property_evaluation: (p) => (
    <PropertyEvaluationSummary journeyId={p.journeyId} stepId={p.step.id} />
  ),
  due_diligence: (p) => <StepDocumentReview stepId={p.step.id} />,
  review_contract: (p) => <StepDocumentReview stepId={p.step.id} />,
  rental_landlord_law: (p) => <RentalLandlordLaw step={p.step} />,
  rental_yield_analysis: (p) => <RentalYieldAnalysis step={p.step} />,
  rental_property_management: (p) => <RentalPropertyManagement step={p.step} />,
  rental_tax_strategy: (p) => <RentalTaxStrategy step={p.step} />,
  rental_operations_setup: (p) => <RentalOperationsSetup step={p.step} />,
  ownership_registration: (p) => <OwnershipRegistration step={p.step} />,
  ownership_insurance: (p) => <OwnershipInsurance step={p.step} />,
  ownership_management: (p) => <OwnershipManagement step={p.step} />,
  ownership_tax_finance: (p) => <OwnershipTaxFinance step={p.step} />,
  rental_search_requirements: (p) => <RentalSearchGuide step={p.step} />,
  rental_application_documents: (p) => <RentalApplicationGuide step={p.step} />,
  rental_contract_review: (p) => <RentalContractReview step={p.step} />,
  rental_move_in_checklist: (p) => <RentalMoveInGuide step={p.step} />,
}

/******************************************************************************
                              Components
******************************************************************************/

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

/** Renders the body content for a journey step: content renderer + tasks + duration. */
function StepBody(props: IProps) {
  const { step, onTaskToggle, onStepOpen } = props
  const { journey } = useJourneyContext()

  const contentRenderer = step.content_key
    ? STEP_CONTENT_REGISTRY[step.content_key]
    : undefined

  const hasTasks = step.tasks.length > 0

  const onStepOpenRef = useRef(onStepOpen)
  onStepOpenRef.current = onStepOpen

  useEffect(() => {
    if (step.status === "not_started") {
      onStepOpenRef.current?.(step.id)
    }
  }, [step.id, step.status])

  return (
    <div className="min-w-0 space-y-4">
      {contentRenderer && (
        <div className="min-w-0">
          {contentRenderer({
            journeyId: journey.id,
            step,
            propertyLocation: journey.property_location,
            propertyType: journey.property_type,
            budgetEuros: journey.budget_euros,
            propertyGoals: journey.property_goals,
            marketInsights: journey.market_insights,
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
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StepBody, STEP_CONTENT_REGISTRY }
export type { IStepContentProps }
