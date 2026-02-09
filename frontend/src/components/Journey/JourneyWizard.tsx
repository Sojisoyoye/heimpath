/**
 * Journey Wizard Component
 * Multi-step wizard for creating a new property journey
 */

import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react"

import { cn } from "@/common/utils"
import { GERMAN_STATES } from "@/common/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { WizardStepIndicator } from "./WizardStepIndicator"
import { PropertyTypeSelector } from "./PropertyTypeSelector"
import { LocationSelector } from "./LocationSelector"
import { FinancingSelector } from "./FinancingSelector"
import { BudgetInput } from "./BudgetInput"
import { TimelineSelector } from "./TimelineSelector"
import { ResidencySelector } from "./ResidencySelector"
import { useCreateJourney } from "@/hooks/mutations"
import type {
  PropertyType,
  FinancingType,
  ResidencyStatus,
  JourneyCreate,
} from "@/models/journey"

interface IProps {
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const WIZARD_STEPS = [
  { id: 1, title: "Property" },
  { id: 2, title: "Location" },
  { id: 3, title: "Financing" },
  { id: 4, title: "Budget" },
  { id: 5, title: "Timeline" },
  { id: 6, title: "Status" },
] as const

/******************************************************************************
                              Types
******************************************************************************/

interface WizardState {
  propertyType?: PropertyType
  targetState?: string
  financingType?: FinancingType
  budgetMin?: number
  budgetMax?: number
  targetDate?: string
  residencyStatus?: ResidencyStatus
}

/******************************************************************************
                              Components
******************************************************************************/

/** Summary review before submission. */
function JourneySummary(props: { state: WizardState }) {
  const { state } = props

  const stateName =
    GERMAN_STATES.find((s) => s.code === state.targetState)?.name ||
    state.targetState

  const formatCurrency = (amount?: number) => {
    if (!amount) return "Not specified"
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Not specified"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  }

  const residencyLabels: Record<ResidencyStatus, string> = {
    german_citizen: "German citizen",
    eu_citizen: "EU/EEA citizen",
    non_eu_resident: "Non-EU resident in Germany",
    non_resident: "Non-resident",
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review Your Journey</h3>
        <p className="text-sm text-muted-foreground">
          Here's a summary of your property buying journey
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Property Type</p>
          <p className="font-medium capitalize">
            {state.propertyType?.replace("_", " ")}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Location</p>
          <p className="font-medium">{stateName}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Financing</p>
          <p className="font-medium capitalize">
            {state.financingType?.replace("_", " ")}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Budget Range</p>
          <p className="font-medium">
            {state.budgetMin || state.budgetMax
              ? `${formatCurrency(state.budgetMin)} - ${formatCurrency(state.budgetMax)}`
              : "Not specified"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Target Date</p>
          <p className="font-medium">{formatDate(state.targetDate)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Residency Status</p>
          <p className="font-medium">
            {state.residencyStatus
              ? residencyLabels[state.residencyStatus]
              : "Not specified"}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
        <Sparkles className="h-5 w-5 shrink-0 text-green-600" />
        <div className="text-sm">
          <p className="font-medium text-green-900 dark:text-green-100">
            Ready to create your journey!
          </p>
          <p className="text-green-800 dark:text-green-200">
            We'll generate a personalized step-by-step guide based on your
            profile. You can always update your preferences later.
          </p>
        </div>
      </div>
    </div>
  )
}

/** Default component. Multi-step journey creation wizard. */
function JourneyWizard(props: IProps) {
  const { className } = props
  const navigate = useNavigate()
  const createJourneyMutation = useCreateJourney()

  const [currentStep, setCurrentStep] = useState(1)
  const [state, setState] = useState<WizardState>({})
  const [showSummary, setShowSummary] = useState(false)

  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!state.propertyType
      case 2:
        return !!state.targetState
      case 3:
        return !!state.financingType
      case 4:
        // Budget is optional, but if provided, max should be >= min
        if (state.budgetMin && state.budgetMax) {
          return state.budgetMax >= state.budgetMin
        }
        return true
      case 5:
        // Timeline is optional
        return true
      case 6:
        return !!state.residencyStatus
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep((prev) => prev + 1)
    } else if (currentStep === WIZARD_STEPS.length && !showSummary) {
      setShowSummary(true)
    }
  }

  const handleBack = () => {
    if (showSummary) {
      setShowSummary(false)
    } else if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (
      !state.propertyType ||
      !state.targetState ||
      !state.financingType ||
      !state.residencyStatus
    ) {
      return
    }

    const journeyData: JourneyCreate = {
      propertyType: state.propertyType,
      targetState: state.targetState,
      financingType: state.financingType,
      residencyStatus: state.residencyStatus,
      budgetMin: state.budgetMin,
      budgetMax: state.budgetMax,
      targetDate: state.targetDate,
    }

    try {
      const newJourney = await createJourneyMutation.mutateAsync(journeyData)
      navigate({ to: "/journeys/$journeyId", params: { journeyId: newJourney.id } })
    } catch {
      // Error is handled by React Query
    }
  }

  const selectedState = GERMAN_STATES.find((s) => s.code === state.targetState)

  const renderStep = () => {
    if (showSummary) {
      return <JourneySummary state={state} />
    }

    switch (currentStep) {
      case 1:
        return (
          <PropertyTypeSelector
            value={state.propertyType}
            onChange={(v) => updateState({ propertyType: v })}
          />
        )
      case 2:
        return (
          <LocationSelector
            value={state.targetState}
            onChange={(v) => updateState({ targetState: v })}
          />
        )
      case 3:
        return (
          <FinancingSelector
            value={state.financingType}
            onChange={(v) => updateState({ financingType: v })}
          />
        )
      case 4:
        return (
          <BudgetInput
            budgetMin={state.budgetMin}
            budgetMax={state.budgetMax}
            onBudgetMinChange={(v) => updateState({ budgetMin: v })}
            onBudgetMaxChange={(v) => updateState({ budgetMax: v })}
            targetState={state.targetState}
            transferTaxRate={selectedState?.transferTaxRate}
          />
        )
      case 5:
        return (
          <TimelineSelector
            value={state.targetDate}
            onChange={(v) => updateState({ targetDate: v })}
          />
        )
      case 6:
        return (
          <ResidencySelector
            value={state.residencyStatus}
            onChange={(v) => updateState({ residencyStatus: v })}
          />
        )
      default:
        return null
    }
  }

  const isLastStep = currentStep === WIZARD_STEPS.length && !showSummary
  const isSubmitStep = showSummary

  return (
    <div className={cn("space-y-8", className)}>
      <WizardStepIndicator
        steps={WIZARD_STEPS.map((s) => ({ id: s.id, title: s.title }))}
        currentStep={showSummary ? WIZARD_STEPS.length + 1 : currentStep}
      />

      <Card>
        <CardContent className="pt-6">{renderStep()}</CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 && !showSummary}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {isSubmitStep ? (
          <Button
            onClick={handleSubmit}
            disabled={createJourneyMutation.isPending}
          >
            {createJourneyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Journey...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create My Journey
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canProceed()}>
            {isLastStep ? "Review" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {createJourneyMutation.isError && (
        <p className="text-sm text-destructive text-center">
          Failed to create journey. Please try again.
        </p>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { JourneyWizard }
