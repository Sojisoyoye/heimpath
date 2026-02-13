/**
 * Property Evaluation Calculator Component
 * Full-page calculator for investment property analysis
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, Download } from "lucide-react";

import { cn } from "@/common/utils";
import { GERMAN_STATES } from "@/common/constants";
import { EVALUATION_DEFAULTS } from "@/common/constants/propertyEvaluation";
import { Button } from "@/components/ui/button";
import {
  PropertyInfoSection,
  RentSection,
  OperatingCostsSection,
  FinancingSection,
  EvaluationSection,
} from "./sections";
import { usePropertyEvaluation } from "./usePropertyEvaluation";
import type {
  PropertyEvaluationState,
  PropertyInfoInputs,
  RentInputs,
  OperatingCostsInputs,
  FinancingInputs,
  PropertyEvaluationCalculatorProps,
} from "./types";

/******************************************************************************
                              Constants
******************************************************************************/

const STORAGE_KEY_PREFIX = "property-evaluation-";

/******************************************************************************
                              Functions
******************************************************************************/

/** Get transfer tax rate for a German state. */
function getTransferTaxRate(stateCode?: string): number {
  if (!stateCode) return 5.0;
  const state = GERMAN_STATES.find((s) => s.code === stateCode);
  return state?.transferTaxRate || 5.0;
}

/** Create initial state with defaults. */
function createInitialState(
  initialStateCode?: string,
  initialBudget?: number
): PropertyEvaluationState {
  const transferTax = getTransferTaxRate(initialStateCode);

  return {
    propertyInfo: {
      address: "",
      squareMeters: 0,
      purchasePrice: initialBudget || 0,
      brokerFeePercent: EVALUATION_DEFAULTS.BROKER_FEE_PERCENT,
      notaryFeePercent: EVALUATION_DEFAULTS.NOTARY_FEE_PERCENT,
      landRegistryFeePercent: EVALUATION_DEFAULTS.LAND_REGISTRY_FEE_PERCENT,
      transferTaxPercent: transferTax,
    },
    rent: {
      rentPerSqm: EVALUATION_DEFAULTS.RENT_PER_SQM,
      parkingRent: EVALUATION_DEFAULTS.PARKING_RENT,
      depreciationRatePercent: EVALUATION_DEFAULTS.DEPRECIATION_RATE_PERCENT,
      buildingSharePercent: EVALUATION_DEFAULTS.BUILDING_SHARE_PERCENT,
      costIncreasePercent: EVALUATION_DEFAULTS.COST_INCREASE_PERCENT,
      rentIncreasePercent: EVALUATION_DEFAULTS.RENT_INCREASE_PERCENT,
      valueIncreasePercent: EVALUATION_DEFAULTS.VALUE_INCREASE_PERCENT,
      equityInterestPercent: EVALUATION_DEFAULTS.EQUITY_INTEREST_PERCENT,
      marginalTaxRatePercent: EVALUATION_DEFAULTS.MARGINAL_TAX_RATE_PERCENT,
    },
    operatingCosts: {
      hausgeldAllocable: EVALUATION_DEFAULTS.HAUSGELD_ALLOCABLE,
      propertyTaxMonthly: EVALUATION_DEFAULTS.PROPERTY_TAX_MONTHLY,
      hausgeldNonAllocable: EVALUATION_DEFAULTS.HAUSGELD_NON_ALLOCABLE,
      reservesPortion: EVALUATION_DEFAULTS.RESERVES_PORTION,
    },
    financing: {
      loanPercent: EVALUATION_DEFAULTS.LOAN_PERCENT,
      interestRatePercent: EVALUATION_DEFAULTS.INTEREST_RATE_PERCENT,
      repaymentRatePercent: EVALUATION_DEFAULTS.REPAYMENT_RATE_PERCENT,
    },
  };
}

/** Load state from localStorage. */
function loadFromStorage(
  journeyId?: string,
  initialStateCode?: string,
  initialBudget?: number
): PropertyEvaluationState {
  if (!journeyId) {
    return createInitialState(initialStateCode, initialBudget);
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + journeyId);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate new structure by checking for a key unique to the new format
      if (
        parsed?.operatingCosts &&
        "hausgeldAllocable" in parsed.operatingCosts &&
        parsed?.rent &&
        !("allocableCostsPerSqm" in parsed.rent)
      ) {
        return parsed as PropertyEvaluationState;
      }
      // Old format detected: discard and use fresh defaults
      localStorage.removeItem(STORAGE_KEY_PREFIX + journeyId);
    }
  } catch {
    // Ignore parse errors
  }

  return createInitialState(initialStateCode, initialBudget);
}

/** Save state to localStorage. */
function saveToStorage(journeyId: string, state: PropertyEvaluationState): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + journeyId, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Property evaluation calculator. */
function PropertyEvaluationCalculator(props: PropertyEvaluationCalculatorProps) {
  const { journeyId, initialState, initialBudget, className } = props;

  const [state, setState] = useState<PropertyEvaluationState>(() =>
    loadFromStorage(journeyId, initialState, initialBudget)
  );

  const { results } = usePropertyEvaluation(state);

  // Save to localStorage when state changes
  useEffect(() => {
    if (journeyId) {
      saveToStorage(journeyId, state);
    }
  }, [journeyId, state]);

  const updatePropertyInfo = useCallback((updates: Partial<PropertyInfoInputs>) => {
    setState((prev) => ({
      ...prev,
      propertyInfo: { ...prev.propertyInfo, ...updates },
    }));
  }, []);

  const updateRent = useCallback((updates: Partial<RentInputs>) => {
    setState((prev) => ({
      ...prev,
      rent: { ...prev.rent, ...updates },
    }));
  }, []);

  const updateOperatingCosts = useCallback((updates: Partial<OperatingCostsInputs>) => {
    setState((prev) => ({
      ...prev,
      operatingCosts: { ...prev.operatingCosts, ...updates },
    }));
  }, []);

  const updateFinancing = useCallback((updates: Partial<FinancingInputs>) => {
    setState((prev) => ({
      ...prev,
      financing: { ...prev.financing, ...updates },
    }));
  }, []);

  const handleReset = () => {
    const newState = createInitialState(initialState, initialBudget);
    setState(newState);
    if (journeyId) {
      saveToStorage(journeyId, newState);
    }
  };

  const handleExport = () => {
    if (!results) return;

    const data = {
      inputs: state,
      results,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `property-evaluation-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Compute total allocable costs for RentSection display
  const totalAllocableCosts =
    state.operatingCosts.hausgeldAllocable +
    state.operatingCosts.propertyTaxMonthly;

  // Calculate total investment for financing section
  const totalIncidentalCostsPercent =
    state.propertyInfo.brokerFeePercent +
    state.propertyInfo.notaryFeePercent +
    state.propertyInfo.landRegistryFeePercent +
    state.propertyInfo.transferTaxPercent;

  const totalInvestment =
    state.propertyInfo.purchasePrice *
    (1 + totalIncidentalCostsPercent / 100);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            to={journeyId ? "/journeys/$journeyId" : "/calculators"}
            params={journeyId ? { journeyId } : {}}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Property Evaluation Calculator</h1>
          <p className="text-muted-foreground">
            Analyze investment property cashflow and returns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!results}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input sections */}
        <div className="space-y-6">
          <PropertyInfoSection
            values={state.propertyInfo}
            onChange={updatePropertyInfo}
          />
          <RentSection
            values={state.rent}
            squareMeters={state.propertyInfo.squareMeters}
            totalAllocableCosts={totalAllocableCosts}
            onChange={updateRent}
          />
          <OperatingCostsSection
            values={state.operatingCosts}
            coldRentMonthly={results?.coldRentMonthly ?? 0}
            onChange={updateOperatingCosts}
          />
          <FinancingSection
            values={state.financing}
            purchasePrice={state.propertyInfo.purchasePrice}
            totalInvestment={totalInvestment}
            onChange={updateFinancing}
          />
        </div>

        {/* Results section - sticky on desktop */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
          <EvaluationSection results={results} />
        </div>
      </div>
    </div>
  );
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyEvaluationCalculator };
