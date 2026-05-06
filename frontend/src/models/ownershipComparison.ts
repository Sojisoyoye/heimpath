/**
 * Ownership Comparison (GmbH vs. Private) types
 */

export interface OwnershipComparisonInput {
  name?: string
  numProperties: number
  annualRentalIncome: number
  personalMarginalTaxRate: number
  annualAppreciation: number
  holdingPeriod: number
  totalPropertyValue: number
  buildingSharePercent?: number
  afaRatePercent?: number
  annualRentIncreasePercent?: number
  gewerbesteuerHebesatz?: number
  gmbhSetupCost?: number
  annualAccountingCost?: number
}

export interface YearProjection {
  year: number
  rentalIncome: number
  tax: number
  netIncomeAfterTax: number
  cumulativeNetIncome: number
  propertyValue: number
}

export interface ScenarioResult {
  effectiveTaxRate: number
  year1Tax: number
  year1NetIncome: number
  totalNetRentalIncome: number
  exitPropertyValue: number
  capitalGains: number
  capitalGainsTax: number
  netExitProceeds: number
  totalWealth: number
  projections: YearProjection[]
}

export interface OwnershipComparisonResult {
  private: ScenarioResult
  gmbh: ScenarioResult
  breakevenYear: number | null
  gmbhAdvantageAtExit: number
  recommendation: string
}

export interface OwnershipComparisonSaved {
  id: string
  name: string | null
  shareId: string | null
  numProperties: number
  annualRentalIncome: number
  personalMarginalTaxRate: number
  annualAppreciation: number
  holdingPeriod: number
  totalPropertyValue: number
  buildingSharePercent: number
  afaRatePercent: number
  annualRentIncreasePercent: number
  gewerbesteuerHebesatz: number
  gmbhSetupCost: number
  annualAccountingCost: number
  privateTotalWealth: number
  gmbhTotalWealth: number
  breakevenYear: number | null
  gmbhAdvantageAtExit: number
  recommendation: string
  results: OwnershipComparisonResult
  createdAt: string
}

export interface OwnershipComparisonSummary {
  id: string
  name: string | null
  shareId: string | null
  numProperties: number
  totalPropertyValue: number
  privateTotalWealth: number
  gmbhTotalWealth: number
  recommendation: string
  createdAt: string
}
