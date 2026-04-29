/**
 * Property Evaluation Calculator Component
 * Full-page calculator for investment property analysis
 */

import { Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  Share2,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { GERMAN_STATES } from "@/common/constants"
import { EVALUATION_DEFAULTS } from "@/common/constants/propertyEvaluation"
import { cn, formatEur } from "@/common/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useCustomToast } from "@/hooks"
import {
  useDeletePropertyEvaluation,
  useSavePropertyEvaluation,
} from "@/hooks/mutations/useCalculatorMutations"
import { useUserPropertyEvaluations } from "@/hooks/queries/useCalculatorQueries"
import type { PropertyEvaluationSummary } from "@/models/propertyEvaluation"
import { CalculatorService } from "@/services/CalculatorService"
import { handleError } from "@/utils"
import {
  AfaCard,
  AnnualCashflowTable,
  EvaluationSection,
  FinancingSection,
  OperatingCostsSection,
  PropertyInfoSection,
  RentSection,
} from "./sections"
import type {
  FinancingInputs,
  OperatingCostsInputs,
  PropertyEvaluationCalculatorProps,
  PropertyEvaluationState,
  PropertyInfoInputs,
  RentInputs,
} from "./types"
import { usePropertyEvaluation } from "./usePropertyEvaluation"

/******************************************************************************
                              Constants
******************************************************************************/

const STORAGE_KEY_PREFIX = "property-evaluation-"

/******************************************************************************
                              Functions
******************************************************************************/

/** Get transfer tax rate for a German state. */
function getTransferTaxRate(stateCode?: string): number {
  if (!stateCode) return 5.0
  const state = GERMAN_STATES.find((s) => s.code === stateCode)
  return state?.transferTaxRate || 5.0
}

/** Create initial state with defaults. */
function createInitialState(
  initialStateCode?: string,
  initialBudget?: number,
): PropertyEvaluationState {
  const transferTax = getTransferTaxRate(initialStateCode)

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
      personalTaxableIncome: EVALUATION_DEFAULTS.PERSONAL_TAXABLE_INCOME,
      renovationYear: EVALUATION_DEFAULTS.RENOVATION_YEAR,
      renovationCost: EVALUATION_DEFAULTS.RENOVATION_COST,
      startYear: EVALUATION_DEFAULTS.START_YEAR,
      analysisYears: EVALUATION_DEFAULTS.ANALYSIS_YEARS,
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
      includeAcquisitionCosts: EVALUATION_DEFAULTS.INCLUDE_ACQUISITION_COSTS,
    },
  }
}

/** Load state from localStorage. */
function loadFromStorage(
  journeyId?: string,
  initialStateCode?: string,
  initialBudget?: number,
): PropertyEvaluationState {
  const storageKey = STORAGE_KEY_PREFIX + (journeyId || "standalone")

  const defaults = createInitialState(initialStateCode, initialBudget)

  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Validate new structure by checking for a key unique to the new format
      if (
        parsed?.operatingCosts &&
        "hausgeldAllocable" in parsed.operatingCosts &&
        parsed?.rent &&
        !("allocableCostsPerSqm" in parsed.rent)
      ) {
        // Merge defaults for any missing new fields (backward compat)
        return {
          ...defaults,
          ...parsed,
          rent: { ...defaults.rent, ...parsed.rent },
          propertyInfo: { ...defaults.propertyInfo, ...parsed.propertyInfo },
          operatingCosts: {
            ...defaults.operatingCosts,
            ...parsed.operatingCosts,
          },
          financing: { ...defaults.financing, ...parsed.financing },
        } as PropertyEvaluationState
      }
      // Old format detected: discard and use fresh defaults
      localStorage.removeItem(storageKey)
    }
  } catch {
    // Ignore parse errors
  }

  return defaults
}

/** Save state to localStorage. */
function saveToStorage(
  journeyId: string,
  state: PropertyEvaluationState,
): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + journeyId, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

/******************************************************************************
                              Components
******************************************************************************/

/** Saved evaluations list. */
function SavedEvaluations(props: {
  evaluations: PropertyEvaluationSummary[]
  onDelete: (id: string) => void
  onLoad: (id: string) => void
  onCopyShare: (shareId: string) => void
  loadingId: string | null
}) {
  const { evaluations, onDelete, onLoad, onCopyShare, loadingId } = props

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Saved Evaluations</CardTitle>
        <CardDescription>
          Click an evaluation to load it into the calculator
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {evaluations.map((ev) => {
            const isLoading = loadingId === ev.id
            return (
              <button
                key={ev.id}
                type="button"
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                disabled={!!loadingId}
                onClick={() => onLoad(ev.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">
                    {ev.name || "Unnamed evaluation"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatEur(ev.purchasePrice)}</span>
                    <span
                      className={
                        ev.isPositiveCashflow
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatEur(ev.cashflowAfterTax)}/mo
                    </span>
                    <span>{ev.grossRentalYield.toFixed(1)}% yield</span>
                  </div>
                </div>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <div className="flex shrink-0">
                    {ev.shareId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCopyShare(ev.shareId as string)
                        }}
                        title="Copy share link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(ev.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/** Default component. Property evaluation calculator. */
function PropertyEvaluationCalculator(
  props: PropertyEvaluationCalculatorProps,
) {
  const {
    journeyId,
    journeyStepId,
    initialState,
    initialBudget,
    initialPurchasePrice,
    propertyUse,
    className,
  } = props

  const isOwnerOccupier = propertyUse === "live_in"

  const [state, setState] = useState<PropertyEvaluationState>(() =>
    loadFromStorage(
      journeyId,
      initialState,
      initialPurchasePrice ?? initialBudget,
    ),
  )
  const [saveName, setSaveName] = useState("")
  const [shareUrl, setShareUrl] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const effectiveState = isOwnerOccupier
    ? {
        ...state,
        rent: { ...state.rent, rentPerSqm: 0, parkingRent: 0 },
      }
    : state

  const { results, isLoading } = usePropertyEvaluation(effectiveState)

  const { showSuccessToast, showErrorToast } = useCustomToast()
  const saveEvaluation = useSavePropertyEvaluation()
  const deleteEvaluation = useDeletePropertyEvaluation()
  const { data: savedEvals } = useUserPropertyEvaluations()

  const storageKey = journeyId || "standalone"

  // Save to localStorage when state changes
  useEffect(() => {
    saveToStorage(storageKey, state)
  }, [storageKey, state])

  const updatePropertyInfo = useCallback(
    (updates: Partial<PropertyInfoInputs>) => {
      setState((prev) => ({
        ...prev,
        propertyInfo: { ...prev.propertyInfo, ...updates },
      }))
    },
    [],
  )

  const updateRent = useCallback((updates: Partial<RentInputs>) => {
    setState((prev) => ({
      ...prev,
      rent: { ...prev.rent, ...updates },
    }))
  }, [])

  const updateOperatingCosts = useCallback(
    (updates: Partial<OperatingCostsInputs>) => {
      setState((prev) => ({
        ...prev,
        operatingCosts: { ...prev.operatingCosts, ...updates },
      }))
    },
    [],
  )

  const updateFinancing = useCallback((updates: Partial<FinancingInputs>) => {
    setState((prev) => ({
      ...prev,
      financing: { ...prev.financing, ...updates },
    }))
  }, [])

  const handleReset = () => {
    const newState = createInitialState(initialState, initialBudget)
    setState(newState)
    saveToStorage(storageKey, newState)
  }

  const handleExport = async () => {
    if (!results) return
    try {
      const { generateEvaluationPdf } = await import("./GenerateEvaluationPdf")
      generateEvaluationPdf(state, results, isOwnerOccupier)
    } catch {
      showErrorToast("Failed to generate PDF. Please try again.")
    }
  }

  const handleSave = () => {
    if (!results) return
    setShareUrl("")
    saveEvaluation.mutate(
      {
        name: saveName || undefined,
        journeyStepId: journeyStepId || undefined,
        inputs: state,
      },
      {
        onSuccess: (saved) => {
          setSaveName("")
          showSuccessToast("Property evaluation saved")
          if (saved.shareId) {
            setShareUrl(
              `${window.location.origin}/shared/evaluation/${saved.shareId}`,
            )
          }
        },
        onError: handleError.bind(showErrorToast),
      },
    )
  }

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl).then(
      () => showSuccessToast("Share link copied to clipboard"),
      () => showErrorToast("Failed to copy link"),
    )
  }

  const handleCopyShareId = (shareId: string) => {
    const url = `${window.location.origin}/shared/evaluation/${shareId}`
    navigator.clipboard.writeText(url).then(
      () => showSuccessToast("Share link copied to clipboard"),
      () => showErrorToast("Failed to copy link"),
    )
  }

  const handleDelete = (id: string) => {
    deleteEvaluation.mutate(id, {
      onSuccess: () => showSuccessToast("Evaluation deleted"),
    })
  }

  const handleLoad = async (id: string) => {
    setLoadingId(id)
    try {
      const evaluation = await CalculatorService.getPropertyEvaluation(id)
      setState(evaluation.inputs)
      setSaveName(evaluation.name || "")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      handleError.call(showErrorToast, err as Error)
    } finally {
      setLoadingId(null)
    }
  }

  // Compute total allocable costs for RentSection display
  const totalAllocableCosts =
    state.operatingCosts.hausgeldAllocable +
    state.operatingCosts.propertyTaxMonthly

  // Calculate total investment for financing section
  const totalIncidentalCostsPercent =
    state.propertyInfo.brokerFeePercent +
    state.propertyInfo.notaryFeePercent +
    state.propertyInfo.landRegistryFeePercent +
    state.propertyInfo.transferTaxPercent

  const totalInvestment =
    state.propertyInfo.purchasePrice * (1 + totalIncidentalCostsPercent / 100)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:gap-4">
        <div className="flex items-start gap-3 sm:flex-1 min-w-0">
          {journeyId && (
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link to="/journeys/$journeyId" params={{ journeyId }}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">
              Property Evaluation Calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              {isOwnerOccupier
                ? "Analyze your monthly cost of ownership"
                : "Analyze investment property cashflow and returns"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
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
            Download as PDF
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
          {!isOwnerOccupier && (
            <RentSection
              values={state.rent}
              squareMeters={state.propertyInfo.squareMeters}
              totalAllocableCosts={totalAllocableCosts}
              stateCode={initialState}
              onChange={updateRent}
            />
          )}
          <OperatingCostsSection
            values={state.operatingCosts}
            coldRentMonthly={results?.totalColdRentMonthly ?? 0}
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
          <EvaluationSection
            results={results}
            isOwnerOccupier={isOwnerOccupier}
            isLoading={isLoading}
          />

          {/* Save Section */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Input
                placeholder="Name this evaluation (optional)"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
              <Button
                onClick={handleSave}
                disabled={saveEvaluation.isPending || !results}
                className="w-full gap-2"
              >
                <Save className="h-4 w-4" />
                {saveEvaluation.isPending ? "Saving..." : "Save Evaluation"}
              </Button>
              {shareUrl && (
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Share Link
                  </p>
                  <div className="flex gap-2">
                    <Input value={shareUrl} readOnly className="text-xs" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyShareUrl}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Annual Cashflow Table */}
      {!isOwnerOccupier && results && results.annualRows.length > 0 && (
        <AnnualCashflowTable rows={results.annualRows} />
      )}

      {/* AfA Depreciation Card */}
      {!isOwnerOccupier && results && (
        <AfaCard
          purchasePrice={state.propertyInfo.purchasePrice}
          buildingSharePercent={state.rent.buildingSharePercent}
          depreciationRatePercent={state.rent.depreciationRatePercent}
          marginalTaxRatePercent={state.rent.marginalTaxRatePercent}
          annualRows={results.annualRows}
        />
      )}

      {/* Saved Evaluations */}
      {savedEvals && savedEvals.data.length > 0 && (
        <SavedEvaluations
          evaluations={savedEvals.data}
          onDelete={handleDelete}
          onLoad={handleLoad}
          onCopyShare={handleCopyShareId}
          loadingId={loadingId}
        />
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyEvaluationCalculator }
