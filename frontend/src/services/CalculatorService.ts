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
import { PATHS } from "./common/Paths"

/******************************************************************************
                              Functions
******************************************************************************/

/** Convert a snake_case string to camelCase. */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

/** Convert a camelCase string to snake_case. */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/** Recursively convert all object keys from snake_case to camelCase. */
function transformKeys<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item)) as T
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        snakeToCamel(key),
        transformKeys(value),
      ]),
    ) as T
  }
  return obj as T
}

/** Recursively convert all object keys from camelCase to snake_case. */
function transformKeysToSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeysToSnake(item))
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        camelToSnake(key),
        transformKeysToSnake(value),
      ]),
    )
  }
  return obj
}

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
}

export const CalculatorService = new CalculatorServiceClass()
