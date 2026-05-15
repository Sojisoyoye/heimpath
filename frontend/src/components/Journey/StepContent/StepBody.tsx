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
import { ResourceCard } from "../ResourceCard"
import { TaskCheckbox } from "../TaskCheckbox"
import { WarningCallout } from "../WarningCallout"
import { BuyingCostsGuide } from "./BuyingCostsGuide"
import { DocumentsPrep } from "./DocumentsPrep"
import { DueDiligenceAndOffer } from "./DueDiligenceAndOffer"
import { FinanceCheck } from "./FinanceCheck"
import { FindAndEvaluateGuide } from "./FindAndEvaluateGuide"
import { LoanCommitmentGuide } from "./LoanCommitmentGuide"
import { ManagementAndFinanceSetup } from "./ManagementAndFinanceSetup"
import { MarketInsights } from "./MarketInsights"
import { MortgageComparison } from "./MortgageComparison"
import { MortgagePreapproval } from "./MortgagePreapproval"
import { NotaryAndContract } from "./NotaryAndContract"
import { NotarySigningGuide } from "./NotarySigningGuide"
import { OwnershipInsurance } from "./OwnershipInsurance"
import { OwnershipManagement } from "./OwnershipManagement"
import { OwnershipRegistration } from "./OwnershipRegistration"
import { OwnershipTaxFinance } from "./OwnershipTaxFinance"
import { OwnershipTransferGuide } from "./OwnershipTransferGuide"
import { PaymentAndTransferTaxGuide } from "./PaymentAndTransferTaxGuide"
import { ProofOfFundsGuide } from "./ProofOfFundsGuide"
import { PropertyEvaluationSummary } from "./PropertyEvaluationSummary"
import { PropertyGoalsAndMarket } from "./PropertyGoalsAndMarket"
import { PropertyGoalsForm } from "./PropertyGoalsForm"
import { RegistrationAndInsurance } from "./RegistrationAndInsurance"
import { RentalApplicationGuide } from "./RentalApplicationGuide"
import { RentalContractReview } from "./RentalContractReview"
import { RentalLandlordLaw } from "./RentalLandlordLaw"
import { RentalMoveInGuide } from "./RentalMoveInGuide"
import { RentalOperationsSetup } from "./RentalOperationsSetup"
import { RentalPropertyManagement } from "./RentalPropertyManagement"
import { RentalSearchGuide } from "./RentalSearchGuide"
import { RentalTaxStrategy } from "./RentalTaxStrategy"
import { RentalYieldAnalysis } from "./RentalYieldAnalysis"
import { SecureFinancing } from "./SecureFinancing"
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

// v1 legacy keys — kept for backwards compatibility with existing journeys
// v2 merged keys use dedicated composite components
const STEP_CONTENT_REGISTRY: Record<
  string,
  (props: IStepContentProps) => ReactNode
> = {
  // v1 individual step keys
  finance_check: (p) => <FinanceCheck step={p.step} />,
  mortgage_preapproval: (p) => <MortgagePreapproval step={p.step} />,
  mortgage_comparison: (p) => <MortgageComparison step={p.step} />,
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
  // v2 merged keys
  property_goals_and_market: (p) => (
    <PropertyGoalsAndMarket
      journeyId={p.journeyId}
      propertyLocation={p.propertyLocation}
      propertyType={p.propertyType}
      budgetEuros={p.budgetEuros}
      propertyGoals={p.propertyGoals}
      marketInsights={p.marketInsights}
    />
  ),
  secure_financing: (p) => <SecureFinancing step={p.step} />,
  registration_and_insurance: (p) => <RegistrationAndInsurance step={p.step} />,
  management_and_finance_setup: (p) => (
    <ManagementAndFinanceSetup step={p.step} />
  ),
  find_and_evaluate_property: (p) => (
    <FindAndEvaluateGuide journeyId={p.journeyId} stepId={p.step.id} />
  ),
  buying_costs: (p) => <BuyingCostsGuide step={p.step} />,
  proof_of_funds: (p) => <ProofOfFundsGuide step={p.step} />,
  documents_prep: (p) => <DocumentsPrep step={p.step} />,
  due_diligence_and_offer: (p) => <DueDiligenceAndOffer step={p.step} />,
  notary_and_contract: (p) => <NotaryAndContract step={p.step} />,
  loan_commitment: (p) => <LoanCommitmentGuide step={p.step} />,
  notary_signing: (p) => <NotarySigningGuide step={p.step} />,
  payment_and_transfer_tax: (p) => <PaymentAndTransferTaxGuide step={p.step} />,
  ownership_transfer: (p) => <OwnershipTransferGuide step={p.step} />,
}

/******************************************************************************
                              Components
******************************************************************************/

interface IStepTasksProps {
  tasks: JourneyTask[]
  stepId: string
  stepStatus: StepStatus
  onToggle?: (stepId: string, taskId: string, isCompleted: boolean) => void
}

/** Inline task list with progress for a step, split by task category. */
function StepTasks(props: Readonly<IStepTasksProps>) {
  const { tasks, stepId, stepStatus, onToggle } = props

  const actionTasks = tasks.filter((t) => t.task_category === "action")
  const resourceTasks = tasks.filter((t) => t.task_category === "resource")
  const warningTasks = tasks.filter((t) => t.task_category === "warning")

  const completedTasks = actionTasks.filter((t) => t.is_completed).length
  const totalTasks = actionTasks.length
  const progressPercent =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const isDisabled = stepStatus === "skipped"

  const handleToggle = (taskId: string, isCompleted: boolean) => {
    onToggle?.(stepId, taskId, isCompleted)
  }

  return (
    <div className="space-y-3">
      {warningTasks.length > 0 && <WarningCallout tasks={warningTasks} />}

      {actionTasks.length > 0 && (
        <div className="space-y-2">
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
            {actionTasks.map((task) => (
              <TaskCheckbox
                key={task.id}
                task={task}
                onToggle={handleToggle}
                disabled={isDisabled}
              />
            ))}
          </div>
        </div>
      )}

      {resourceTasks.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">
            Resources
          </span>
          <div className="space-y-1.5">
            {resourceTasks.map((task) => (
              <ResourceCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
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
