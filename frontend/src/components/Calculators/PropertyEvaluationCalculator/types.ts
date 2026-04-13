/**
 * Property Evaluation Calculator types
 * Component-specific props and re-exports of domain types
 */

export type {
  AnnualCashflowRow,
  EvaluationResults,
  FinancingInputs,
  OperatingCostsInputs,
  PropertyEvaluationState,
  PropertyInfoInputs,
  RentInputs,
} from "@/models/propertyEvaluation"

export interface PropertyEvaluationCalculatorProps {
  journeyId?: string
  journeyStepId?: string
  initialState?: string // German state code for transfer tax
  initialBudget?: number
  propertyUse?: "live_in" | "rent_out"
  className?: string
}
