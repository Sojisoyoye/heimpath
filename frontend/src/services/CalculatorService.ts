/**
 * Calculator Service
 * Handles all API calls related to hidden cost calculations
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
  FinancingAssessment,
  FinancingAssessmentInput,
  FinancingAssessmentSummary,
  HiddenCostCalculation,
  HiddenCostCalculationInput,
  HiddenCostCalculationSummary,
  ROICalculation,
  ROICalculationInput,
  ROICalculationSummary,
  StateComparisonResponse,
  StateRatesResponse,
} from "@/models/calculator"
import type {
  PropertyEvaluationInput,
  PropertyEvaluationRecord,
  PropertyEvaluationSummary,
} from "@/models/propertyEvaluation"
import { PATHS } from "./common/Paths"
import { transformKeys, transformKeysToSnake } from "./common/transformKeys"

/******************************************************************************
                              Service
******************************************************************************/

class CalculatorServiceClass {
  /**
   * Get all German state transfer tax rates and cost defaults
   */
  async getStateRates(): Promise<StateRatesResponse> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.STATE_RATES,
    })
    return transformKeys<StateRatesResponse>(response)
  }

  /**
   * Save a hidden cost calculation
   */
  async saveCalculation(
    input: HiddenCostCalculationInput,
  ): Promise<HiddenCostCalculation> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.CALCULATORS.HIDDEN_COSTS,
      body: transformKeysToSnake(input),
      mediaType: "application/json",
    })
    return transformKeys<HiddenCostCalculation>(response)
  }

  /**
   * Get a specific saved calculation by ID
   */
  async getCalculation(id: string): Promise<HiddenCostCalculation> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.HIDDEN_COSTS_DETAIL(id),
    })
    return transformKeys<HiddenCostCalculation>(response)
  }

  /**
   * Get a shared calculation by share_id (no auth required)
   */
  async getByShareId(shareId: string): Promise<HiddenCostCalculation> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.HIDDEN_COSTS_SHARE(shareId),
    })
    return transformKeys<HiddenCostCalculation>(response)
  }

  /**
   * Get all saved calculations for the current user
   */
  async getUserCalculations(): Promise<{
    data: HiddenCostCalculationSummary[]
    count: number
  }> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.HIDDEN_COSTS,
    })
    return transformKeys<{
      data: HiddenCostCalculationSummary[]
      count: number
    }>(response)
  }

  /**
   * Delete a saved calculation
   */
  async deleteCalculation(id: string): Promise<void> {
    await request<void>(OpenAPI, {
      method: "DELETE",
      url: PATHS.CALCULATORS.HIDDEN_COSTS_DETAIL(id),
    })
  }

  /**
   * Compare hidden costs across all German states
   */
  async compareStates(
    price: number,
    includeAgent: boolean,
  ): Promise<StateComparisonResponse> {
    const params = new URLSearchParams({
      price: String(price),
      include_agent: String(includeAgent),
    })
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.CALCULATORS.HIDDEN_COSTS_COMPARE}?${params.toString()}`,
    })
    return transformKeys<StateComparisonResponse>(response)
  }

  // -------------------------------------------------------------------------
  // ROI Calculator
  // -------------------------------------------------------------------------

  /**
   * Save an ROI calculation
   */
  async saveROICalculation(
    input: ROICalculationInput,
  ): Promise<ROICalculation> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.CALCULATORS.ROI,
      body: transformKeysToSnake(input),
      mediaType: "application/json",
    })
    return transformKeys<ROICalculation>(response)
  }

  /**
   * Get a specific saved ROI calculation by ID
   */
  async getROICalculation(id: string): Promise<ROICalculation> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.ROI_DETAIL(id),
    })
    return transformKeys<ROICalculation>(response)
  }

  /**
   * Get a shared ROI calculation by share_id (no auth required)
   */
  async getROIByShareId(shareId: string): Promise<ROICalculation> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.CALCULATORS.ROI}/share/${shareId}`,
    })
    return transformKeys<ROICalculation>(response)
  }

  /**
   * Get all saved ROI calculations for the current user
   */
  async getUserROICalculations(): Promise<{
    data: ROICalculationSummary[]
    count: number
  }> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.ROI,
    })
    return transformKeys<{ data: ROICalculationSummary[]; count: number }>(
      response,
    )
  }

  /**
   * Delete a saved ROI calculation
   */
  async deleteROICalculation(id: string): Promise<void> {
    await request<void>(OpenAPI, {
      method: "DELETE",
      url: PATHS.CALCULATORS.ROI_DETAIL(id),
    })
  }

  /**
   * Compare multiple ROI scenarios
   */
  async compareROIScenarios(
    scenarios: ROICalculationInput[],
  ): Promise<{ scenarios: Record<string, unknown>[] }> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.CALCULATORS.ROI_COMPARE,
      body: transformKeysToSnake({ scenarios }),
      mediaType: "application/json",
    })
    return transformKeys<{ scenarios: Record<string, unknown>[] }>(response)
  }
  // -------------------------------------------------------------------------
  // Financing Eligibility
  // -------------------------------------------------------------------------

  /**
   * Save a financing eligibility assessment
   */
  async saveFinancingAssessment(
    input: FinancingAssessmentInput,
  ): Promise<FinancingAssessment> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.FINANCING.ELIGIBILITY,
      body: transformKeysToSnake(input),
      mediaType: "application/json",
    })
    return transformKeys<FinancingAssessment>(response)
  }

  /**
   * Get a specific financing assessment by ID
   */
  async getFinancingAssessment(id: string): Promise<FinancingAssessment> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.FINANCING.ELIGIBILITY_DETAIL(id),
    })
    return transformKeys<FinancingAssessment>(response)
  }

  /**
   * Get a shared financing assessment by share_id (no auth required)
   */
  async getFinancingByShareId(shareId: string): Promise<FinancingAssessment> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.FINANCING.ELIGIBILITY_SHARE(shareId),
    })
    return transformKeys<FinancingAssessment>(response)
  }

  /**
   * Get all saved financing assessments for the current user
   */
  async getUserFinancingAssessments(): Promise<{
    data: FinancingAssessmentSummary[]
    count: number
  }> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.FINANCING.ELIGIBILITY,
    })
    return transformKeys<{ data: FinancingAssessmentSummary[]; count: number }>(
      response,
    )
  }

  /**
   * Delete a saved financing assessment
   */
  async deleteFinancingAssessment(id: string): Promise<void> {
    await request<void>(OpenAPI, {
      method: "DELETE",
      url: PATHS.FINANCING.ELIGIBILITY_DETAIL(id),
    })
  }

  // -------------------------------------------------------------------------
  // Property Evaluation
  // -------------------------------------------------------------------------

  /** Save a property evaluation */
  async savePropertyEvaluation(
    input: PropertyEvaluationInput,
  ): Promise<PropertyEvaluationRecord> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.CALCULATORS.PROPERTY_EVALUATIONS,
      body: transformKeysToSnake(input),
      mediaType: "application/json",
    })
    return transformKeys<PropertyEvaluationRecord>(response)
  }

  /** Get a specific property evaluation by ID */
  async getPropertyEvaluation(id: string): Promise<PropertyEvaluationRecord> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.PROPERTY_EVALUATIONS_DETAIL(id),
    })
    return transformKeys<PropertyEvaluationRecord>(response)
  }

  /** Get a shared property evaluation by share_id (no auth required) */
  async getPropertyEvaluationByShareId(
    shareId: string,
  ): Promise<PropertyEvaluationRecord> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.PROPERTY_EVALUATIONS_SHARE(shareId),
    })
    return transformKeys<PropertyEvaluationRecord>(response)
  }

  /** Get all saved property evaluations for the current user */
  async getUserPropertyEvaluations(): Promise<{
    data: PropertyEvaluationSummary[]
    count: number
  }> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.PROPERTY_EVALUATIONS,
    })
    return transformKeys<{
      data: PropertyEvaluationSummary[]
      count: number
    }>(response)
  }

  /** Get property evaluations for a specific journey step */
  async getStepPropertyEvaluations(stepId: string): Promise<{
    data: PropertyEvaluationSummary[]
    count: number
  }> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.PROPERTY_EVALUATIONS_STEP(stepId),
    })
    return transformKeys<{
      data: PropertyEvaluationSummary[]
      count: number
    }>(response)
  }

  /** Delete a saved property evaluation */
  async deletePropertyEvaluation(id: string): Promise<void> {
    await request<void>(OpenAPI, {
      method: "DELETE",
      url: PATHS.CALCULATORS.PROPERTY_EVALUATIONS_DETAIL(id),
    })
  }
}

export const CalculatorService = new CalculatorServiceClass()
