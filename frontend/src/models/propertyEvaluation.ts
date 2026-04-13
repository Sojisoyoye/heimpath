/**
 * Property Evaluation domain models
 * TypeScript interfaces for property evaluation records and calculator state
 */

export interface PropertyInfoInputs {
  address: string
  squareMeters: number
  purchasePrice: number
  brokerFeePercent: number
  notaryFeePercent: number
  landRegistryFeePercent: number
  transferTaxPercent: number
}

export interface RentInputs {
  rentPerSqm: number
  parkingRent: number
  depreciationRatePercent: number
  buildingSharePercent: number
  costIncreasePercent: number
  rentIncreasePercent: number
  valueIncreasePercent: number
  equityInterestPercent: number
  marginalTaxRatePercent: number
  personalTaxableIncome: number
  renovationYear: number
  renovationCost: number
  startYear: number
  analysisYears: number
}

export interface OperatingCostsInputs {
  hausgeldAllocable: number
  propertyTaxMonthly: number
  hausgeldNonAllocable: number
  reservesPortion: number
}

export interface FinancingInputs {
  loanPercent: number
  interestRatePercent: number
  repaymentRatePercent: number
  includeAcquisitionCosts: boolean
}

export interface AnnualCashflowRow {
  year: number
  coldRent: number
  managementAnnual: number
  operationalCf: number
  loanBalanceStart: number
  interest: number
  repayment: number
  loanBalanceEnd: number
  financingCf: number
  netCfPretax: number
  renovationDeduction: number
  earningsBeforeTax: number
  taxEffectMarginal: number
  netCfAfterTax: number
  taxableIncomeAdjusted: number
  incomeTaxAdjusted: number
  actualTaxSaving: number
  propertyValue: number
  equityBuildupAccumulated: number
  equityContribution: number
}

export interface EvaluationResults {
  // Property Purchase
  pricePerM2: number
  brokerFeeAmount: number
  notaryFeeAmount: number
  landRegistryFeeAmount: number
  propertyTransferTaxAmount: number
  totalClosingCosts: number
  totalClosingCostsPct: number
  totalInvestment: number

  // Rent
  apartmentColdRentMonthly: number
  totalColdRentMonthly: number
  allocableCostsMonthly: number
  warmRentMonthly: number

  // Management Costs
  nonAllocableCostsMonthly: number
  totalHausgeldMonthly: number
  nonAllocableAsPctOfColdRent: number

  // Depreciation
  afaBasis: number
  annualAfa: number
  monthlyAfaDisplay: number

  // Financing
  loanAmount: number
  equity: number
  annualDebtService: number
  monthlyDebtService: number
  monthlyInterestYr1: number
  monthlyRepaymentYr1: number

  // Rental Yield
  netColdRentAnnual: number
  grossRentalYield: number
  factorColdRentVsPrice: number

  // Monthly Cashflow
  monthlyCashflowPretax: number
  monthlyTaxablePropertyIncome: number
  monthlyTaxBenefit: number
  monthlyCashflowAfterTax: number

  // Tax Context
  personalTaxableIncome: number
  baseIncomeTax: number
  avgTaxRateDisplay: number
  personalMarginalTaxRate: number

  // Annual Cashflow Table
  annualRows: AnnualCashflowRow[]

  // Summary KPIs
  totalOperationalCf: number
  totalFinancingCf: number
  totalNetCfBeforeTax: number
  totalNetCfAfterTax: number
  totalEquityInvested: number
  finalEquityKpi: number
}

export interface PropertyEvaluationState {
  propertyInfo: PropertyInfoInputs
  rent: RentInputs
  operatingCosts: OperatingCostsInputs
  financing: FinancingInputs
}

export interface PropertyEvaluationRecord {
  id: string
  name?: string
  shareId?: string
  journeyStepId?: string
  purchasePrice: number
  squareMeters: number
  stateCode?: string
  cashflowAfterTax: number
  grossRentalYield: number
  returnOnEquity: number
  isPositiveCashflow: boolean
  inputs: PropertyEvaluationState
  results: EvaluationResults
  createdAt: string
}

export interface PropertyEvaluationSummary {
  id: string
  name?: string
  shareId?: string
  purchasePrice: number
  cashflowAfterTax: number
  grossRentalYield: number
  isPositiveCashflow: boolean
  createdAt: string
}

export interface PropertyEvaluationInput {
  name?: string
  journeyStepId?: string
  inputs: PropertyEvaluationState
}
