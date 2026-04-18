/**
 * Mortgage Amortisation Types
 * Interfaces for German annuity mortgage calculations
 */

export interface MortgageInput {
  propertyPrice: number
  downPaymentAmount: number
  downPaymentPercent: number
  interestRate: number
  initialRepaymentRate: number
  fixedRatePeriod: number
  specialRepaymentPercent: number
}

export interface AmortisationRow {
  year: number
  annualPayment: number
  interestPortion: number
  principalPortion: number
  specialRepayment: number
  remainingBalance: number
}

export interface MortgageResult {
  loanAmount: number
  monthlyPayment: number
  annualPayment: number
  ltvRatio: number
  remainingBalanceAtFixedEnd: number
  totalInterestDuringFixed: number
  totalPrincipalDuringFixed: number
  totalInterestOverLife: number
  yearsToFullRepayment: number
  fullRepaymentDate: string
  schedule: AmortisationRow[]
}

export interface MortgageScenarioInput {
  id: string
  label: string
  interestRate: number
  initialRepaymentRate: number
  fixedRatePeriod: number
  specialRepaymentPercent: number
}
