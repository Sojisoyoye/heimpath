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
  RentCeilingCheckInput,
  RentCeilingCheckResult,
  RentEstimate,
  ROICalculation,
  ROICalculationInput,
  ROICalculationSummary,
  StateComparisonResponse,
  StateRatesResponse,
} from "@/models/calculator"
import type { AreaSummary, ComparisonMetrics } from "@/models/marketComparison"
import type {
  OwnershipComparisonInput,
  OwnershipComparisonResult,
  OwnershipComparisonSaved,
  OwnershipComparisonSummary,
} from "@/models/ownershipComparison"
import type {
  EvaluationResults,
  PropertyEvaluationInput,
  PropertyEvaluationRecord,
  PropertyEvaluationState,
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
  // Rent Estimate
  // -------------------------------------------------------------------------

  /**
   * Get a rent estimate for a German postcode (no auth required)
   */
  async getRentEstimate(
    postcode: string,
    sizeSqm?: number,
    buildingYear?: number,
  ): Promise<RentEstimate> {
    const params = new URLSearchParams({ postcode })
    if (sizeSqm != null) params.set("size_sqm", String(sizeSqm))
    if (buildingYear != null) params.set("building_year", String(buildingYear))
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.MARKET.RENT_ESTIMATE}?${params.toString()}`,
    })
    return transformKeys<RentEstimate>(response)
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

  /** Run property evaluation calculation without saving */
  async calculatePropertyEvaluation(
    state: PropertyEvaluationState,
  ): Promise<EvaluationResults> {
    const body = this._flattenInputsForApi(state)
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.CALCULATORS.PROPERTY_EVALUATIONS_CALCULATE,
      body,
      mediaType: "application/json",
    })
    return transformKeys<EvaluationResults>(response)
  }

  /** Flatten nested PropertyEvaluationState to flat API request body.
   * Field mapping must stay in sync with PropertyEvaluationCalculateRequest schema. */
  private _flattenInputsForApi(
    state: PropertyEvaluationState,
  ): Record<string, unknown> {
    const { propertyInfo, rent, operatingCosts, financing } = state
    return {
      address: propertyInfo.address,
      square_meters: propertyInfo.squareMeters,
      purchase_price: propertyInfo.purchasePrice,
      rent_per_m2: rent.rentPerSqm,
      parking_space_rent: rent.parkingRent,
      broker_fee_percent: propertyInfo.brokerFeePercent,
      notary_fee_percent: propertyInfo.notaryFeePercent,
      land_registry_fee_percent: propertyInfo.landRegistryFeePercent,
      property_transfer_tax_percent: propertyInfo.transferTaxPercent,
      base_allocable_costs: operatingCosts.hausgeldAllocable,
      property_tax_monthly: operatingCosts.propertyTaxMonthly,
      base_non_allocable_costs: operatingCosts.hausgeldNonAllocable,
      reserves_monthly: operatingCosts.reservesPortion,
      building_share_percent: rent.buildingSharePercent,
      afa_rate_percent: rent.depreciationRatePercent,
      loan_percent: financing.loanPercent,
      interest_rate_percent: financing.interestRatePercent,
      initial_repayment_rate_percent: financing.repaymentRatePercent,
      personal_taxable_income: rent.personalTaxableIncome,
      marginal_tax_rate_percent: rent.marginalTaxRatePercent,
      cost_increase_percent: rent.costIncreasePercent,
      rent_increase_percent: rent.rentIncreasePercent,
      value_increase_percent: rent.valueIncreasePercent,
      equity_interest_percent: rent.equityInterestPercent,
      renovation_year: rent.renovationYear,
      renovation_cost: rent.renovationCost,
      start_year: rent.startYear,
      analysis_years: rent.analysisYears,
    }
  }

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

  // -------------------------------------------------------------------------
  // Market Comparison
  // -------------------------------------------------------------------------

  /** Get all available areas for comparison (no auth required) */
  async getAreas(): Promise<AreaSummary[]> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.MARKET.AREAS,
    })
    const data = transformKeys<{ areas: AreaSummary[] }>(response)
    return data.areas
  }

  /** Compare 2–4 areas side by side (no auth required) */
  async compareCities(keys: string[]): Promise<ComparisonMetrics[]> {
    const params = new URLSearchParams()
    for (const key of keys) {
      params.append("keys", key)
    }
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.MARKET.COMPARE}?${params.toString()}`,
    })
    const data = transformKeys<{ areas: ComparisonMetrics[] }>(response)
    return data.areas
  }

  // -------------------------------------------------------------------------
  // Ownership Comparison (GmbH vs. Private)
  // -------------------------------------------------------------------------

  /** Calculate GmbH vs. private comparison without saving */
  async calculateOwnershipComparison(
    input: OwnershipComparisonInput,
  ): Promise<OwnershipComparisonResult> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.CALCULATORS.OWNERSHIP_COMPARISON_CALCULATE,
      body: transformKeysToSnake(input),
      mediaType: "application/json",
    })
    return transformKeys<OwnershipComparisonResult>(response)
  }

  /** Save an ownership comparison */
  async saveOwnershipComparison(
    input: OwnershipComparisonInput,
  ): Promise<OwnershipComparisonSaved> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.CALCULATORS.OWNERSHIP_COMPARISON,
      body: transformKeysToSnake(input),
      mediaType: "application/json",
    })
    return transformKeys<OwnershipComparisonSaved>(response)
  }

  /** Get a specific ownership comparison by ID */
  async getOwnershipComparison(id: string): Promise<OwnershipComparisonSaved> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.OWNERSHIP_COMPARISON_DETAIL(id),
    })
    return transformKeys<OwnershipComparisonSaved>(response)
  }

  /** Get a shared ownership comparison by share_id (no auth required) */
  async getOwnershipComparisonByShareId(
    shareId: string,
  ): Promise<OwnershipComparisonSaved> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.OWNERSHIP_COMPARISON_SHARE(shareId),
    })
    return transformKeys<OwnershipComparisonSaved>(response)
  }

  /** Get all saved ownership comparisons for the current user */
  async getUserOwnershipComparisons(): Promise<{
    data: OwnershipComparisonSummary[]
    count: number
  }> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CALCULATORS.OWNERSHIP_COMPARISON,
    })
    return transformKeys<{
      data: OwnershipComparisonSummary[]
      count: number
    }>(response)
  }

  /** Delete a saved ownership comparison */
  async deleteOwnershipComparison(id: string): Promise<void> {
    await request<void>(OpenAPI, {
      method: "DELETE",
      url: PATHS.CALCULATORS.OWNERSHIP_COMPARISON_DETAIL(id),
    })
  }

  // -------------------------------------------------------------------------
  // Mietpreisbremse Rent Ceiling Check
  // -------------------------------------------------------------------------

  /**
   * Check whether current rent exceeds the Mietpreisbremse cap (no auth required)
   */
  async checkRentCeiling(
    input: RentCeilingCheckInput,
  ): Promise<RentCeilingCheckResult> {
    const params = new URLSearchParams({
      city: input.city,
      postcode: input.postcode,
      size_sqm: String(input.sizeSqm),
      current_rent: String(input.currentRent),
    })
    if (input.buildingYear != null) {
      params.set("building_year", String(input.buildingYear))
    }
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.CALCULATORS.RENT_CEILING_CHECK}?${params.toString()}`,
    })
    return transformKeys<RentCeilingCheckResult>(response)
  }
}

export const CalculatorService = new CalculatorServiceClass()
