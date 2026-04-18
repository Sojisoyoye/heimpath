/**
 * Mortgage Calculation Functions
 * Pure TypeScript — German annuity mortgage (Annuitätendarlehen) formulas
 */

import type {
  AmortisationRow,
  MortgageInput,
  MortgageResult,
  MortgageScenarioInput,
} from "@/models/mortgageAmortisation"

/******************************************************************************
                              Constants
******************************************************************************/

const MAX_YEARS = 100

/******************************************************************************
                              Functions
******************************************************************************/

/**
 * Keep down-payment EUR and % in sync.
 * Pass `amount` when the user edits the EUR field, `percent` when they edit %.
 */
function syncDownPayment(
  propertyPrice: number,
  amount?: number,
  percent?: number,
): { amount: number; percent: number } {
  if (amount !== undefined) {
    const clamped = Math.min(amount, propertyPrice)
    return {
      amount: clamped,
      percent: propertyPrice > 0 ? (clamped / propertyPrice) * 100 : 0,
    }
  }
  if (percent !== undefined) {
    const clamped = Math.min(percent, 100)
    return {
      amount: propertyPrice * (clamped / 100),
      percent: clamped,
    }
  }
  return { amount: 0, percent: 0 }
}

/**
 * Calculate full mortgage amortisation schedule using German annuity formula.
 *
 * Annuität = loanAmount × (Sollzins + Anfangstilgung)
 * Monthly payment = Annuität / 12
 * Each month: interest = balance × (rate / 12), principal = monthly - interest
 * Sondertilgung applied at year end, capped at remaining balance.
 */
function calculateMortgage(input: MortgageInput): MortgageResult {
  const loanAmount = input.propertyPrice - input.downPaymentAmount
  const rate = input.interestRate / 100
  const repayment = input.initialRepaymentRate / 100
  const annualPayment = loanAmount * (rate + repayment)
  const monthlyPayment = annualPayment / 12
  const ltvRatio =
    input.propertyPrice > 0 ? (loanAmount / input.propertyPrice) * 100 : 0
  const maxSpecial = loanAmount * (input.specialRepaymentPercent / 100)

  const schedule: AmortisationRow[] = []
  let balance = loanAmount
  let totalInterestDuringFixed = 0
  let totalPrincipalDuringFixed = 0
  let totalInterestOverLife = 0
  let remainingBalanceAtFixedEnd = 0

  for (let year = 1; year <= MAX_YEARS && balance > 0; year++) {
    let yearInterest = 0
    let yearPrincipal = 0

    for (let month = 1; month <= 12 && balance > 0; month++) {
      const monthInterest = balance * (rate / 12)
      const monthPrincipal = Math.min(monthlyPayment - monthInterest, balance)
      yearInterest += monthInterest
      yearPrincipal += monthPrincipal
      balance = Math.max(0, balance - monthPrincipal)
    }

    // Sondertilgung at year end
    const special = Math.min(maxSpecial, balance)
    balance = Math.max(0, balance - special)

    totalInterestOverLife += yearInterest

    if (year <= input.fixedRatePeriod) {
      totalInterestDuringFixed += yearInterest
      totalPrincipalDuringFixed += yearPrincipal + special
    }

    if (year === input.fixedRatePeriod) {
      remainingBalanceAtFixedEnd = balance
    }

    schedule.push({
      year,
      annualPayment: yearInterest + yearPrincipal + special,
      interestPortion: yearInterest,
      principalPortion: yearPrincipal,
      specialRepayment: special,
      remainingBalance: balance,
    })

    if (balance <= 0) break
  }

  const yearsToFullRepayment = schedule.length
  const now = new Date()
  const fullRepaymentDate = `${now.getFullYear() + yearsToFullRepayment}`

  // If loop ended without reaching fixedRatePeriod, set remaining balance
  if (schedule.length < input.fixedRatePeriod) {
    remainingBalanceAtFixedEnd = 0
  }

  return {
    loanAmount,
    monthlyPayment,
    annualPayment,
    ltvRatio,
    remainingBalanceAtFixedEnd,
    totalInterestDuringFixed,
    totalPrincipalDuringFixed,
    totalInterestOverLife,
    yearsToFullRepayment,
    fullRepaymentDate,
    schedule,
  }
}

/**
 * Run multiple scenarios sharing the same property price and down payment.
 */
function calculateCompareScenarios(
  baseInput: MortgageInput,
  scenarios: MortgageScenarioInput[],
): MortgageResult[] {
  return scenarios.map((s) =>
    calculateMortgage({
      ...baseInput,
      interestRate: s.interestRate,
      initialRepaymentRate: s.initialRepaymentRate,
      fixedRatePeriod: s.fixedRatePeriod,
      specialRepaymentPercent: s.specialRepaymentPercent,
    }),
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { calculateCompareScenarios, calculateMortgage, syncDownPayment }
