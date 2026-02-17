/**
 * Property Evaluation Calculator constants
 * Default values for investment property analysis
 */

export const EVALUATION_DEFAULTS = {
  // Transaction costs (percentages)
  BROKER_FEE_PERCENT: 3.57,
  NOTARY_FEE_PERCENT: 1.5,
  LAND_REGISTRY_FEE_PERCENT: 0.5,

  // Depreciation and building
  DEPRECIATION_RATE_PERCENT: 2.0,
  BUILDING_SHARE_PERCENT: 70,

  // Forecast assumptions (annual percentages)
  COST_INCREASE_PERCENT: 2.0,
  RENT_INCREASE_PERCENT: 2.0,
  VALUE_INCREASE_PERCENT: 1.5,

  // Tax and equity (under Rent, Taxes, Forecast section)
  EQUITY_INTEREST_PERCENT: 5.0,
  MARGINAL_TAX_RATE_PERCENT: 42,

  // Financing defaults
  LOAN_PERCENT: 100,
  INTEREST_RATE_PERCENT: 4.0,
  REPAYMENT_RATE_PERCENT: 2.0,

  // Operating costs defaults (EUR/month absolute - user enters from Abrechnung)
  HAUSGELD_ALLOCABLE: 0,
  PROPERTY_TAX_MONTHLY: 0,
  HAUSGELD_NON_ALLOCABLE: 0,
  RESERVES_PORTION: 0,

  // Rent defaults
  RENT_PER_SQM: 12.0,
  PARKING_RENT: 50,
} as const

export const SECTION_COLORS = {
  propertyInfo:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400",
  rent: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400",
  operatingCosts:
    "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400",
  financing:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400",
  evaluation: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
} as const
