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

export type CostCategory =
  | "hausgeld"
  | "grundsteuer"
  | "insurance"
  | "heating"
  | "water"
  | "electricity"
  | "maintenance"
  | "misc"

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  hausgeld: "Hausgeld",
  grundsteuer: "Grundsteuer",
  insurance: "Insurance",
  heating: "Heating",
  water: "Water",
  electricity: "Electricity",
  maintenance: "Maintenance",
  misc: "Miscellaneous",
}

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
  journeyId: string | null
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
  journeyId: string | null
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
  costCategory: CostCategory | null
  estimatedAmount: number | null
  createdAt: string
}

export interface PortfolioTransactionInput {
  type: TransactionType
  amount: number
  date: string
  category?: string | null
  description?: string | null
  isRecurring?: boolean
  costCategory?: CostCategory | null
  estimatedAmount?: number | null
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

export interface MonthlyPerformance {
  month: string
  income: number
  expenses: number
  netCashFlow: number
}

export interface PortfolioPerformance {
  months: MonthlyPerformance[]
  hasData: boolean
}

export interface CostCategorySummary {
  category: string
  actualTotal: number
  estimatedTotal: number | null
  variance: number | null
  variancePercent: number | null
  isOverThreshold: boolean
}

export interface CostSummaryResponse {
  categories: CostCategorySummary[]
  totalActual: number
  totalEstimated: number | null
  totalVariance: number | null
  highestCategory: string | null
  alertCategories: string[]
}
