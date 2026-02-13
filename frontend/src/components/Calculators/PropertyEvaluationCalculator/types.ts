/**
 * Property Evaluation Calculator types
 * Interfaces for investment property analysis
 */

export interface PropertyInfoInputs {
  address: string;
  squareMeters: number;
  purchasePrice: number;
  brokerFeePercent: number;
  notaryFeePercent: number;
  landRegistryFeePercent: number;
  transferTaxPercent: number;
}

export interface RentInputs {
  rentPerSqm: number;
  parkingRent: number;
  depreciationRatePercent: number;
  buildingSharePercent: number;
  costIncreasePercent: number;
  rentIncreasePercent: number;
  valueIncreasePercent: number;
  equityInterestPercent: number;
  marginalTaxRatePercent: number;
}

export interface OperatingCostsInputs {
  hausgeldAllocable: number;
  propertyTaxMonthly: number;
  hausgeldNonAllocable: number;
  reservesPortion: number;
}

export interface FinancingInputs {
  loanPercent: number;
  interestRatePercent: number;
  repaymentRatePercent: number;
}

export interface EvaluationResults {
  // Property metrics
  pricePerSqm: number;
  totalIncidentalCostsPercent: number;
  totalIncidentalCosts: number;
  totalInvestment: number;

  // Rent metrics
  coldRentMonthly: number;
  warmRentMonthly: number;
  netColdRentYearly: number;
  grossRentalYield: number;
  coldRentFactor: number;

  // Operating costs (derived)
  totalAllocableCosts: number;
  totalNonAllocableCosts: number;
  totalHausgeld: number;

  // Financing metrics
  loanAmount: number;
  equityAmount: number;
  monthlyInterest: number;
  monthlyRepayment: number;
  debtServiceMonthly: number;

  // Tax calculation
  depreciationYearly: number;
  depreciationMonthly: number;
  interestYearly: number;
  taxableIncome: number;
  taxableCashflowMonthly: number;
  taxYearly: number;
  taxMonthly: number;

  // Cashflow
  cashflowBeforeTax: number;
  cashflowAfterTax: number;
  isPositiveCashflow: boolean;

  // Return metrics
  netRentalYield: number;
  returnOnEquity: number;
  returnOnEquityWithoutAppreciation: number;
}

export interface PropertyEvaluationState {
  propertyInfo: PropertyInfoInputs;
  rent: RentInputs;
  operatingCosts: OperatingCostsInputs;
  financing: FinancingInputs;
}

export interface PropertyEvaluationCalculatorProps {
  journeyId?: string;
  initialState?: string; // German state code for transfer tax
  initialBudget?: number;
  className?: string;
}
