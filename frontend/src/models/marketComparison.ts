/**
 * Market Comparison Models
 * Types for city/area comparison feature
 */

export interface AreaSummary {
  key: string
  name: string
  areaType: "city" | "state"
  stateCode: string
  stateName: string
}

export interface ComparisonMetrics {
  key: string
  name: string
  areaType: "city" | "state"
  stateCode: string
  stateName: string
  avgPricePerSqm: number
  priceRangeMin: number
  priceRangeMax: number
  avgRentPerSqm: number | null
  rentRangeMin: number | null
  rentRangeMax: number | null
  grossRentalYield: number | null
  transferTaxRate: number
  agentFeePercent: number | null
  trend: string | null
  hasMietspiegel: boolean
}
