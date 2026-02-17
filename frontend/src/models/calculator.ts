/**
 * Calculator domain models
 * TypeScript interfaces for hidden cost and ROI calculations
 */

export interface StateRate {
  stateCode: string
  stateName: string
  transferTaxRate: number
}

export interface CostDefaults {
  notaryFeePercent: number
  landRegistryFeePercent: number
  agentCommissionPercent: number
}

export interface StateRatesResponse {
  data: StateRate[]
  costDefaults: CostDefaults
}

export interface HiddenCostCalculationInput {
  name?: string
  propertyPrice: number
  stateCode: string
  propertyType: string
  includeAgent: boolean
  renovationLevel: "none" | "light" | "medium" | "full"
  includeMoving: boolean
}

export interface HiddenCostCalculation {
  id: string
  name?: string
  shareId?: string
  propertyPrice: number
  stateCode: string
  propertyType: string
  includeAgent: boolean
  renovationLevel: string
  includeMoving: boolean
  transferTax: number
  notaryFee: number
  landRegistryFee: number
  agentCommission: number
  renovationEstimate: number
  movingCosts: number
  totalAdditionalCosts: number
  totalCostOfOwnership: number
  additionalCostPercentage: number
  createdAt: string
}

export interface HiddenCostCalculationSummary {
  id: string
  name?: string
  shareId?: string
  propertyPrice: number
  stateCode: string
  totalAdditionalCosts: number
  totalCostOfOwnership: number
  createdAt: string
}

export interface StateComparisonItem {
  stateCode: string
  stateName: string
  transferTaxRate: number
  transferTax: number
  notaryFee: number
  landRegistryFee: number
  agentCommission: number
  totalCost: number
}

export interface StateComparisonResponse {
  propertyPrice: number
  includeAgent: boolean
  data: StateComparisonItem[]
}

// ---------------------------------------------------------------------------
// ROI Calculator
// ---------------------------------------------------------------------------

export interface ROICalculationInput {
  name?: string
  purchasePrice: number
  downPayment: number
  monthlyRent: number
  monthlyExpenses: number
  annualAppreciation: number
  vacancyRate: number
  mortgageRate: number
  mortgageTerm: number
}

export interface ProjectionYear {
  year: number
  propertyValue: number
  equity: number
  cumulativeCashFlow: number
  totalReturn: number
  totalReturnPercent: number
}

export interface ROICalculation {
  id: string
  name?: string
  shareId?: string
  // Inputs
  purchasePrice: number
  downPayment: number
  monthlyRent: number
  monthlyExpenses: number
  annualAppreciation: number
  vacancyRate: number
  mortgageRate: number
  mortgageTerm: number
  // Results
  grossRentalIncome: number
  netOperatingIncome: number
  annualCashFlow: number
  monthlyMortgagePayment: number
  grossYield: number
  netYield: number
  capRate: number
  cashOnCashReturn: number
  investmentGrade: number
  investmentGradeLabel: string
  // Projections
  projections: ProjectionYear[]
  createdAt: string
}

export interface ROICalculationSummary {
  id: string
  name?: string
  shareId?: string
  purchasePrice: number
  investmentGrade: number
  investmentGradeLabel: string
  annualCashFlow: number
  createdAt: string
}

// ---------------------------------------------------------------------------
// Financing Eligibility Wizard
// ---------------------------------------------------------------------------

export type EmploymentStatus =
  | "permanent"
  | "fixed_term"
  | "self_employed"
  | "freelance"
  | "civil_servant"

export type SchufaRating =
  | "excellent"
  | "good"
  | "satisfactory"
  | "adequate"
  | "poor"
  | "unknown"

export type FinancingResidencyStatus =
  | "german_citizen"
  | "eu_citizen"
  | "permanent_resident"
  | "temporary_resident"
  | "non_eu"

export interface FinancingAssessmentInput {
  name?: string
  employmentStatus: EmploymentStatus
  employmentYears: number
  monthlyNetIncome: number
  monthlyDebt: number
  availableDownPayment: number
  schufaRating: SchufaRating
  residencyStatus: FinancingResidencyStatus
}

export interface FinancingAssessment {
  id: string
  name?: string
  shareId?: string
  // Inputs
  employmentStatus: string
  employmentYears: number
  monthlyNetIncome: number
  monthlyDebt: number
  availableDownPayment: number
  schufaRating: string
  residencyStatus: string
  // Score breakdown
  employmentScore: number
  incomeRatioScore: number
  downPaymentScore: number
  schufaScore: number
  residencyScore: number
  yearsBonusScore: number
  // Results
  totalScore: number
  likelihoodLabel: string
  // Estimates
  maxLoanEstimate: number
  recommendedDownPaymentPercent: number
  expectedRateMin: number
  expectedRateMax: number
  ltvRatio: number
  // Advisory
  strengths: string[]
  improvements: string[]
  documentChecklist: string[]
  createdAt: string
}

export interface FinancingAssessmentSummary {
  id: string
  name?: string
  shareId?: string
  totalScore: number
  likelihoodLabel: string
  maxLoanEstimate: number
  createdAt: string
}
