/**
 * Calculator Query Hooks
 * React Query hooks for hidden cost calculator data fetching
 */

import { useQuery } from "@tanstack/react-query";
import { CalculatorService } from "@/services/CalculatorService";
import { queryKeys } from "@/query/queryKeys";

/**
 * Get all German state transfer tax rates
 */
export function useStateRates() {
  return useQuery({
    queryKey: queryKeys.calculators.stateRates(),
    queryFn: () => CalculatorService.getStateRates(),
    staleTime: 30 * 60 * 1000, // Rates rarely change
  });
}

/**
 * Get a specific saved calculation by ID
 */
export function useHiddenCostCalculation(id: string) {
  return useQuery({
    queryKey: queryKeys.calculators.hiddenCosts(id),
    queryFn: () => CalculatorService.getCalculation(id),
    enabled: !!id,
  });
}

/**
 * Get a shared calculation by share_id
 */
export function useHiddenCostByShareId(shareId: string) {
  return useQuery({
    queryKey: queryKeys.calculators.hiddenCostsShare(shareId),
    queryFn: () => CalculatorService.getByShareId(shareId),
    enabled: !!shareId,
  });
}

/**
 * Get all saved calculations for current user
 */
export function useUserCalculations() {
  return useQuery({
    queryKey: queryKeys.calculators.hiddenCostsList(),
    queryFn: () => CalculatorService.getUserCalculations(),
  });
}

/**
 * Compare costs across all states for a given price
 */
export function useStateComparison(price: number, includeAgent: boolean) {
  return useQuery({
    queryKey: queryKeys.calculators.stateComparison(price, includeAgent),
    queryFn: () => CalculatorService.compareStates(price, includeAgent),
    enabled: price > 0,
  });
}

// ---------------------------------------------------------------------------
// ROI Calculator
// ---------------------------------------------------------------------------

/**
 * Get a specific saved ROI calculation by ID
 */
export function useROICalculation(id: string) {
  return useQuery({
    queryKey: queryKeys.calculators.roi(id),
    queryFn: () => CalculatorService.getROICalculation(id),
    enabled: !!id,
  });
}

/**
 * Get a shared ROI calculation by share_id
 */
export function useROIByShareId(shareId: string) {
  return useQuery({
    queryKey: queryKeys.calculators.roiShare(shareId),
    queryFn: () => CalculatorService.getROIByShareId(shareId),
    enabled: !!shareId,
  });
}

/**
 * Get all saved ROI calculations for current user
 */
export function useUserROICalculations() {
  return useQuery({
    queryKey: queryKeys.calculators.roiList(),
    queryFn: () => CalculatorService.getUserROICalculations(),
  });
}

// ---------------------------------------------------------------------------
// Financing Eligibility
// ---------------------------------------------------------------------------

/**
 * Get a specific financing assessment by ID
 */
export function useFinancingAssessment(id: string) {
  return useQuery({
    queryKey: queryKeys.financing.eligibility(id),
    queryFn: () => CalculatorService.getFinancingAssessment(id),
    enabled: !!id,
  });
}

/**
 * Get a shared financing assessment by share_id
 */
export function useFinancingByShareId(shareId: string) {
  return useQuery({
    queryKey: queryKeys.financing.eligibilityShare(shareId),
    queryFn: () => CalculatorService.getFinancingByShareId(shareId),
    enabled: !!shareId,
  });
}

/**
 * Get all saved financing assessments for current user
 */
export function useUserFinancingAssessments() {
  return useQuery({
    queryKey: queryKeys.financing.eligibilityList(),
    queryFn: () => CalculatorService.getUserFinancingAssessments(),
  });
}
