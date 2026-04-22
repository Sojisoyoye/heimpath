/**
 * Journey Wizard Component
 * Multi-step wizard for creating a new property journey
 */

import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCreateJourney } from "@/hooks/mutations"
import type {
  JourneyCreate,
  JourneyPublic,
  JourneyType,
} from "@/models/journey"
import { BudgetInput } from "./BudgetInput"
import { FinancingSelector } from "./FinancingSelector"
import { JourneyGenerating } from "./JourneyGenerating"
import { JourneySummary, type WizardState } from "./JourneySummary"
import { JourneyTypeSelector } from "./JourneyTypeSelector"
import { LocationSelector } from "./LocationSelector"
import { PropertyTypeSelector } from "./PropertyTypeSelector"
import { PropertyUseSelector } from "./PropertyUseSelector"
import { ResidencySelector } from "./ResidencySelector"
import { TimelineSelector } from "./TimelineSelector"
import { WizardStepIndicator } from "./WizardStepIndicator"

interface IProps {
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const BUYING_WIZARD_STEPS = [
  { id: 1, title: "Journey" },
  { id: 2, title: "Property" },
  { id: 3, title: "Purpose" },
  { id: 4, title: "Location" },
  { id: 5, title: "Financing" },
  { id: 6, title: "Budget" },
  { id: 7, title: "Timeline" },
  { id: 8, title: "Status" },
] as const

const RENTAL_WIZARD_STEPS = [
  { id: 1, title: "Journey" },
  { id: 2, title: "Location" },
  { id: 3, title: "Budget" },
  { id: 4, title: "Timeline" },
  { id: 5, title: "Status" },
] as const

const STORAGE_STATE_KEY = "heimpath-wizard-state"
const STORAGE_STEP_KEY = "heimpath-wizard-step"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Multi-step journey creation wizard. */
function JourneyWizard(props: IProps) {
  const { className } = props
  const navigate = useNavigate()
  const createJourneyMutation = useCreateJourney()

  const [currentStep, setCurrentStep] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_STEP_KEY)
      return stored ? Number(stored) : 1
    } catch {
      return 1
    }
  })
  const [state, setState] = useState<WizardState>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_STATE_KEY)
      return stored ? (JSON.parse(stored) as WizardState) : {}
    } catch {
      return {}
    }
  })
  const [showSummary, setShowSummary] = useState(false)
  const [wizardPhase, setWizardPhase] = useState<
    "input" | "generating" | "complete"
  >("input")
  const [createdJourney, setCreatedJourney] = useState<JourneyPublic | null>(
    null,
  )

  const isRental = state.journeyType === "rental"
  const wizardSteps = isRental ? RENTAL_WIZARD_STEPS : BUYING_WIZARD_STEPS

  // Persist selections to sessionStorage so Back navigation restores them
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(state))
    } catch {
      // ignore — sessionStorage unavailable
    }
  }, [state])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_STEP_KEY, String(currentStep))
    } catch {
      // ignore — sessionStorage unavailable
    }
  }, [currentStep])

  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const handleJourneyTypeChange = (v: JourneyType) => {
    // When switching journey type, reset step to 1 and clear type-specific fields
    updateState({
      journeyType: v,
      propertyType: undefined,
      propertyUse: undefined,
      financingType: undefined,
    })
  }

  const canProceed = (): boolean => {
    if (currentStep === 1) return !!state.journeyType

    if (isRental) {
      switch (currentStep) {
        case 2:
          return !!state.targetState
        case 3:
          // Budget is optional
          if (state.budgetMin && state.budgetMax) {
            return state.budgetMax >= state.budgetMin
          }
          return true
        case 4:
          return true // Timeline optional
        case 5:
          return !!state.residencyStatus
        default:
          return false
      }
    }

    // Buying flow
    switch (currentStep) {
      case 2:
        return !!state.propertyType
      case 3:
        return !!state.propertyUse
      case 4:
        return !!state.targetState
      case 5:
        return !!state.financingType
      case 6:
        if (state.budgetMin && state.budgetMax) {
          return state.budgetMax >= state.budgetMin
        }
        return true
      case 7:
        return true
      case 8:
        return !!state.residencyStatus
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < wizardSteps.length) {
      setCurrentStep((prev) => prev + 1)
    } else if (currentStep === wizardSteps.length && !showSummary) {
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

  const clearWizardStorage = () => {
    try {
      sessionStorage.removeItem(STORAGE_STATE_KEY)
      sessionStorage.removeItem(STORAGE_STEP_KEY)
    } catch {
      // ignore
    }
  }

  const handleSubmit = async () => {
    if (!state.targetState || !state.residencyStatus || !state.journeyType) {
      return
    }

    // Buying requires additional fields
    if (!isRental && (!state.propertyType || !state.financingType)) {
      return
    }

    const hasGermanResidency =
      state.residencyStatus === "german_citizen" ||
      state.residencyStatus === "eu_citizen" ||
      state.residencyStatus === "non_eu_resident"

    const journeyData: JourneyCreate = {
      title: isRental ? "My Rental Journey" : "My Property Journey",
      questionnaire: {
        journey_type: state.journeyType,
        property_type: isRental ? undefined : state.propertyType,
        property_location: state.targetState,
        financing_type: isRental ? undefined : state.financingType,
        is_first_time_buyer: true,
        has_german_residency: hasGermanResidency,
        budget_euros: state.budgetMax || state.budgetMin,
        budget_min_euros: state.budgetMin,
        target_purchase_date: state.targetDate,
        property_use: isRental ? undefined : state.propertyUse,
      },
    }

    try {
      const newJourney = await createJourneyMutation.mutateAsync(journeyData)
      clearWizardStorage()
      setCreatedJourney(newJourney)
      setWizardPhase("generating")
    } catch {
      // Error is handled by React Query
    }
  }

  // Steps with a confirmed selection — drives the green checkmark in the indicator
  const completedSteps = useMemo((): Set<number> => {
    const done = new Set<number>()
    if (state.journeyType) done.add(1)

    if (isRental) {
      if (state.targetState) done.add(2)
      if (currentStep > 3) done.add(3) // Budget optional
      if (currentStep > 4) done.add(4) // Timeline optional
      if (state.residencyStatus) done.add(5)
    } else {
      if (state.propertyType) done.add(2)
      if (state.propertyUse) done.add(3)
      if (state.targetState) done.add(4)
      if (state.financingType) done.add(5)
      if (currentStep > 6) done.add(6) // Budget optional
      if (currentStep > 7) done.add(7) // Timeline optional
      if (state.residencyStatus) done.add(8)
    }
    return done
  }, [state, currentStep, isRental])

  // Transition from generating animation to complete after 2 seconds
  useEffect(() => {
    if (wizardPhase !== "generating") return
    const timer = setTimeout(() => setWizardPhase("complete"), 2000)
    return () => clearTimeout(timer)
  }, [wizardPhase])

  const handleViewJourney = () => {
    if (!createdJourney) return
    navigate({
      to: "/journeys/$journeyId",
      params: { journeyId: createdJourney.id },
    })
  }

  const renderStep = () => {
    if (showSummary) {
      return <JourneySummary state={state} />
    }

    // Step 1 is always journey type selection
    if (currentStep === 1) {
      return (
        <JourneyTypeSelector
          value={state.journeyType}
          onChange={handleJourneyTypeChange}
        />
      )
    }

    if (isRental) {
      switch (currentStep) {
        case 2:
          return (
            <LocationSelector
              value={state.targetState}
              onChange={(v) => updateState({ targetState: v })}
            />
          )
        case 3:
          return (
            <BudgetInput
              budgetMin={state.budgetMin}
              budgetMax={state.budgetMax}
              onBudgetMinChange={(v) => updateState({ budgetMin: v })}
              onBudgetMaxChange={(v) => updateState({ budgetMax: v })}
            />
          )
        case 4:
          return (
            <TimelineSelector
              value={state.targetDate}
              onChange={(v) => updateState({ targetDate: v })}
            />
          )
        case 5:
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

    // Buying flow
    switch (currentStep) {
      case 2:
        return (
          <PropertyTypeSelector
            value={state.propertyType}
            onChange={(v) => updateState({ propertyType: v })}
          />
        )
      case 3:
        return (
          <PropertyUseSelector
            value={state.propertyUse}
            onChange={(v) => updateState({ propertyUse: v })}
          />
        )
      case 4:
        return (
          <LocationSelector
            value={state.targetState}
            onChange={(v) => updateState({ targetState: v })}
          />
        )
      case 5:
        return (
          <FinancingSelector
            value={state.financingType}
            onChange={(v) => updateState({ financingType: v })}
          />
        )
      case 6:
        return (
          <BudgetInput
            budgetMin={state.budgetMin}
            budgetMax={state.budgetMax}
            onBudgetMinChange={(v) => updateState({ budgetMin: v })}
            onBudgetMaxChange={(v) => updateState({ budgetMax: v })}
          />
        )
      case 7:
        return (
          <TimelineSelector
            value={state.targetDate}
            onChange={(v) => updateState({ targetDate: v })}
          />
        )
      case 8:
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

  // Show generating/complete screen after successful submission
  if (wizardPhase !== "input" && createdJourney) {
    return (
      <JourneyGenerating
        journey={createdJourney}
        phase={wizardPhase}
        onViewJourney={handleViewJourney}
      />
    )
  }

  const isLastStep = currentStep === wizardSteps.length && !showSummary
  const isSubmitStep = showSummary

  return (
    <div className={cn("space-y-8 overflow-hidden", className)}>
      <WizardStepIndicator
        steps={wizardSteps.map((s) => ({ id: s.id, title: s.title }))}
        currentStep={showSummary ? wizardSteps.length + 1 : currentStep}
        completedSteps={completedSteps}
      />

      <Card>
        <CardContent className="pt-6">{renderStep()}</CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
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
