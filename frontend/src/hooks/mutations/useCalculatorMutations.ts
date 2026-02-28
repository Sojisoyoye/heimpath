/**
 * Calculator Mutation Hooks
 * React Query hooks for hidden cost and ROI calculator mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  FinancingAssessmentInput,
  HiddenCostCalculationInput,
  ROICalculationInput,
} from "@/models/calculator"
import type { PropertyEvaluationInput } from "@/models/propertyEvaluation"
import { queryKeys } from "@/query/queryKeys"
import { CalculatorService } from "@/services/CalculatorService"

/**
 * Save a hidden cost calculation
 */
export function useSaveCalculation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: HiddenCostCalculationInput) =>
      CalculatorService.saveCalculation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calculators.hiddenCostsList(),
      })
    },
  })
}

/**
 * Delete a saved calculation
 */
export function useDeleteCalculation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => CalculatorService.deleteCalculation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calculators.hiddenCostsList(),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// ROI Calculator
// ---------------------------------------------------------------------------

/**
 * Save an ROI calculation
 */
export function useSaveROICalculation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ROICalculationInput) =>
      CalculatorService.saveROICalculation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calculators.roiList(),
      })
    },
  })
}

/**
 * Delete a saved ROI calculation
 */
export function useDeleteROICalculation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => CalculatorService.deleteROICalculation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calculators.roiList(),
      })
    },
  })
}

/**
 * Compare multiple ROI scenarios
 */
export function useCompareROIScenarios() {
  return useMutation({
    mutationFn: (scenarios: ROICalculationInput[]) =>
      CalculatorService.compareROIScenarios(scenarios),
  })
}

// ---------------------------------------------------------------------------
// Financing Eligibility
// ---------------------------------------------------------------------------

/**
 * Save a financing eligibility assessment
 */
export function useSaveFinancingAssessment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: FinancingAssessmentInput) =>
      CalculatorService.saveFinancingAssessment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.financing.eligibilityList(),
      })
    },
  })
}

/**
 * Delete a saved financing assessment
 */
export function useDeleteFinancingAssessment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => CalculatorService.deleteFinancingAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.financing.eligibilityList(),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Property Evaluation
// ---------------------------------------------------------------------------

/** Save a property evaluation */
export function useSavePropertyEvaluation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PropertyEvaluationInput) =>
      CalculatorService.savePropertyEvaluation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calculators.propertyEvaluationList(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.calculators.all,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.journeys.all,
      })
    },
  })
}

/** Delete a saved property evaluation */
export function useDeletePropertyEvaluation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => CalculatorService.deletePropertyEvaluation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calculators.propertyEvaluationList(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.calculators.all,
      })
    },
  })
}
