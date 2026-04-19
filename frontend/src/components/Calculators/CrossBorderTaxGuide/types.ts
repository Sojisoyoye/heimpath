/**
 * Cross-Border Tax Guide Types
 * TypeScript interfaces for country-specific tax data
 */

export interface IDbaInfo {
  hasTreaty: boolean
  treatyYear: number | null
  reliefMethod: "exemption" | "credit" | "mixed" | null
  rentalIncomeRule: string
  capitalGainsRule: string
  notes: string
}

export interface ITaxRate {
  rate: number
  label: string
  note?: string
}

export interface IWithholdingRates {
  rentalIncome: ITaxRate
  capitalGains: ITaxRate
  dividends: ITaxRate
  dbaReducedDividends: ITaxRate | null
}

export interface IFilingRequirement {
  formName: string
  description: string
  deadline: string
}

export interface IDeductibleExpense {
  category: string
  description: string
  availableToNonResidents: boolean
}

export interface ICountryTaxData {
  code: string
  name: string
  flag: string
  dba: IDbaInfo
  withholding: IWithholdingRates
  filings: IFilingRequirement[]
  expenses: IDeductibleExpense[]
  deadlines: string[]
  notes: string[]
}

export interface IResidentComparison {
  aspect: string
  residentTreatment: string
  nonResidentTreatment: string
  favored: "resident" | "non-resident" | "neutral"
}
