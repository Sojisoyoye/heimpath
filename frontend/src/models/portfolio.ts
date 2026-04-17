/**
 * Portfolio models for rental property management
 */

export type TransactionType =
  | "rent_income"
  | "operating_expense"
  | "maintenance"
  | "insurance"
  | "hausgeld"
  | "mortgage_interest"
  | "tax_payment"
  | "other_income"
  | "other_expense"

export const INCOME_TYPES: TransactionType[] = ["rent_income", "other_income"]

export interface PortfolioProperty {
  id: string
  address: string
  city: string
  postcode: string
  stateCode: string | null
  purchasePrice: number
  purchaseDate: string | null
  squareMeters: number
  buildingYear: number | null
  currentValueEstimate: number | null
  monthlyRentTarget: number | null
  tenantName: string | null
  leaseStartDate: string | null
  leaseEndDate: string | null
  monthlyHausgeld: number | null
  isVacant: boolean
  notes: string | null
  createdAt: string
}

export interface PortfolioPropertyInput {
  address: string
  city: string
  postcode: string
  stateCode?: string | null
  purchasePrice: number
  purchaseDate?: string | null
  squareMeters: number
  buildingYear?: number | null
  currentValueEstimate?: number | null
  monthlyRentTarget?: number | null
  tenantName?: string | null
  leaseStartDate?: string | null
  leaseEndDate?: string | null
  monthlyHausgeld?: number | null
  isVacant?: boolean
  notes?: string | null
}

export interface PortfolioPropertySummary {
  id: string
  address: string
  city: string
  postcode: string
  purchasePrice: number
  monthlyRentTarget: number | null
  isVacant: boolean
  createdAt: string
}

export interface PortfolioTransaction {
  id: string
  propertyId: string
  type: TransactionType
  amount: number
  date: string
  category: string | null
  description: string | null
  isRecurring: boolean
  createdAt: string
}

export interface PortfolioTransactionInput {
  type: TransactionType
  amount: number
  date: string
  category?: string | null
  description?: string | null
  isRecurring?: boolean
}

export interface PortfolioSummary {
  totalProperties: number
  totalPurchaseValue: number
  totalCurrentValue: number
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  vacancyRate: number
  averageGrossYield: number
}
