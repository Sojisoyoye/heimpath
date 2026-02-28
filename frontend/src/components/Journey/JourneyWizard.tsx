/**
 * Journey Wizard Component
 * Multi-step wizard for creating a new property journey
 */

import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react"
import { useState } from "react"
import { GERMAN_STATES } from "@/common/constants"
import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCreateJourney } from "@/hooks/mutations"
import type {
  FinancingType,
  JourneyCreate,
  PropertyType,
  ResidencyStatus,
} from "@/models/journey"
import { BudgetInput } from "./BudgetInput"
import { FinancingSelector } from "./FinancingSelector"
import { JourneySummary } from "./JourneySummary"
import { LocationSelector } from "./LocationSelector"
import { PropertyTypeSelector } from "./PropertyTypeSelector"
import { ResidencySelector } from "./ResidencySelector"
import { TimelineSelector } from "./TimelineSelector"
import { WizardStepIndicator } from "./WizardStepIndicator"

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

    // Transform wizard state to backend-compatible format
    const hasGermanResidency =
      state.residencyStatus === "german_citizen" ||
      state.residencyStatus === "eu_citizen" ||
      state.residencyStatus === "non_eu_resident"

    const journeyData: JourneyCreate = {
      title: "My Property Journey",
      questionnaire: {
        property_type: state.propertyType,
        property_location: state.targetState,
        financing_type: state.financingType,
        is_first_time_buyer: true, // Default value, can be added to wizard later
        has_german_residency: hasGermanResidency,
        budget_euros: state.budgetMax || state.budgetMin,
        target_purchase_date: state.targetDate,
      },
    }

    try {
      const newJourney = await createJourneyMutation.mutateAsync(journeyData)
      navigate({
        to: "/journeys/$journeyId",
        params: { journeyId: newJourney.id },
      })
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
