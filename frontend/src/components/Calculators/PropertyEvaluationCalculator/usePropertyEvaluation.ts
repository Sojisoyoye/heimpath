/**
 * Property Evaluation Calculator hook
 * Handles all investment property calculations
 */

import { useMemo } from "react";

import type {
  PropertyEvaluationState,
  EvaluationResults,
} from "./types";

/******************************************************************************
                              Types
******************************************************************************/

interface UsePropertyEvaluationResult {
  results: EvaluationResults | null;
  isValid: boolean;
}

/******************************************************************************
                              Hook
******************************************************************************/

/** Calculate property evaluation results. */
function usePropertyEvaluation(state: PropertyEvaluationState): UsePropertyEvaluationResult {
  const results = useMemo(() => {
    const { propertyInfo, rent, operatingCosts, financing } = state;

    // Validate required inputs
    if (
      propertyInfo.purchasePrice <= 0 ||
      propertyInfo.squareMeters <= 0
    ) {
      return null;
    }

    // ========== Property Metrics ==========
    const pricePerSqm = propertyInfo.purchasePrice / propertyInfo.squareMeters;

    const totalIncidentalCostsPercent =
      propertyInfo.brokerFeePercent +
      propertyInfo.notaryFeePercent +
      propertyInfo.landRegistryFeePercent +
      propertyInfo.transferTaxPercent;

    const totalIncidentalCosts =
      propertyInfo.purchasePrice * (totalIncidentalCostsPercent / 100);

    const totalInvestment = propertyInfo.purchasePrice + totalIncidentalCosts;

    // ========== Operating Costs (absolute EUR/month from Abrechnung) ==========
    const totalAllocableCosts =
      operatingCosts.hausgeldAllocable + operatingCosts.propertyTaxMonthly;
    const totalNonAllocableCosts =
      operatingCosts.hausgeldNonAllocable + operatingCosts.reservesPortion;
    const totalHausgeld = totalAllocableCosts + totalNonAllocableCosts;

    // ========== Rent Metrics ==========
    const baseRentMonthly = rent.rentPerSqm * propertyInfo.squareMeters;
    const coldRentMonthly = baseRentMonthly + rent.parkingRent;
    const warmRentMonthly = coldRentMonthly + totalAllocableCosts;
    const netColdRentYearly = coldRentMonthly * 12;

    // Gross yield = Annual cold rent / Purchase price
    const grossRentalYield = (netColdRentYearly / propertyInfo.purchasePrice) * 100;

    // Kaufpreisfaktor = Purchase price / Annual cold rent
    const coldRentFactor =
      netColdRentYearly > 0 ? propertyInfo.purchasePrice / netColdRentYearly : 0;

    // ========== Financing Metrics ==========
    // Loan is a percentage of purchase price (not total investment)
    const loanAmount = propertyInfo.purchasePrice * (financing.loanPercent / 100);
    // Equity covers the gap: total investment minus loan
    const equityAmount = totalInvestment - loanAmount;

    const monthlyInterest = loanAmount * (financing.interestRatePercent / 100) / 12;
    const monthlyRepayment = loanAmount * (financing.repaymentRatePercent / 100) / 12;
    const debtServiceMonthly = monthlyInterest + monthlyRepayment;

    // ========== Tax Calculation ==========
    // AfA basis = building share of purchase price + ALL incidental costs
    const buildingValue =
      propertyInfo.purchasePrice * (rent.buildingSharePercent / 100) +
      totalIncidentalCosts;
    const depreciationYearly = buildingValue * (rent.depreciationRatePercent / 100);
    const depreciationMonthly = depreciationYearly / 12;
    const interestYearly = monthlyInterest * 12;

    // Monthly taxable cashflow: Warm rent - Hausgeld - Interest - Depreciation
    const taxableCashflowMonthly =
      warmRentMonthly - totalHausgeld - monthlyInterest - depreciationMonthly;
    const taxableIncome = taxableCashflowMonthly * 12;
    const taxYearly = taxableIncome * (rent.marginalTaxRatePercent / 100);
    const taxMonthly = taxYearly / 12;

    // ========== Cashflow Calculation ==========
    // Cashflow before tax = Warm rent - Total Hausgeld - Interest - Repayment
    const cashflowBeforeTax = warmRentMonthly - totalHausgeld - debtServiceMonthly;
    const cashflowAfterTax = cashflowBeforeTax - Math.abs(taxMonthly);
    const isPositiveCashflow = cashflowAfterTax >= 0;

    // ========== Return Metrics ==========
    const netColdRentAfterCosts = netColdRentYearly - (totalNonAllocableCosts * 12);
    const netRentalYield = (netColdRentAfterCosts / propertyInfo.purchasePrice) * 100;

    const annualCashflow = cashflowAfterTax * 12;
    const annualAppreciation =
      propertyInfo.purchasePrice * (rent.valueIncreasePercent / 100);

    const returnOnEquity =
      equityAmount > 0
        ? ((annualCashflow + annualAppreciation) / equityAmount) * 100
        : 0;

    const returnOnEquityWithoutAppreciation =
      equityAmount > 0 ? (annualCashflow / equityAmount) * 100 : 0;

    return {
      pricePerSqm,
      totalIncidentalCostsPercent,
      totalIncidentalCosts,
      totalInvestment,
      coldRentMonthly,
      warmRentMonthly,
      netColdRentYearly,
      grossRentalYield,
      coldRentFactor,
      totalAllocableCosts,
      totalNonAllocableCosts,
      totalHausgeld,
      loanAmount,
      equityAmount,
      monthlyInterest,
      monthlyRepayment,
      debtServiceMonthly,
      depreciationYearly,
      depreciationMonthly,
      interestYearly,
      taxableIncome,
      taxableCashflowMonthly,
      taxYearly,
      taxMonthly,
      cashflowBeforeTax,
      cashflowAfterTax,
      isPositiveCashflow,
      netRentalYield,
      returnOnEquity,
      returnOnEquityWithoutAppreciation,
    };
  }, [state]);

  return {
    results,
    isValid: results !== null,
  };
}

/******************************************************************************
                              Export
******************************************************************************/

export { usePropertyEvaluation };
