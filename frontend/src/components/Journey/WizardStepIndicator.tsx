/**
 * Wizard Step Indicator Component
 * Shows progress through wizard steps
 */

import { Check } from "lucide-react"

import { cn } from "@/common/utils"

interface WizardStep {
  id: number
  title: string
}

interface IProps {
  steps: WizardStep[]
  currentStep: number
  /** Step IDs that have a confirmed selection — shown with green checkmark. */
  completedSteps?: Set<number>
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Single step indicator. */
function StepDot(props: {
  step: WizardStep
  isCurrent: boolean
  isCompleted: boolean
  isLast: boolean
}) {
  const { step, isCurrent, isCompleted, isLast } = props

  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-all",
            isCompleted
              ? "border-green-600 bg-green-600 text-white"
              : isCurrent
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-muted-foreground/30 bg-background text-muted-foreground",
          )}
        >
          {isCompleted ? <Check className="h-5 w-5" /> : step.id}
        </div>
        <span
          className={cn(
            "mt-2 text-xs font-medium text-center max-w-[80px]",
            isCompleted
              ? "text-green-600"
              : isCurrent
                ? "text-foreground"
                : "text-muted-foreground",
          )}
        >
          {step.title}
        </span>
      </div>

      {!isLast && (
        <div
          className={cn(
            "mx-2 h-0.5 w-12 sm:w-16",
            isCompleted ? "bg-green-600" : "bg-muted-foreground/30",
          )}
        />
      )}
    </div>
  )
}

/** Default component. Wizard step indicator showing progress through steps. */
function WizardStepIndicator(props: IProps) {
  const { steps, currentStep, completedSteps, className } = props

  return (
    <div className={cn("flex items-start justify-center", className)}>
      {steps.map((step, index) => (
        <StepDot
          key={step.id}
          step={step}
          isCurrent={step.id === currentStep}
          isCompleted={
            completedSteps ? completedSteps.has(step.id) : step.id < currentStep
          }
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { WizardStepIndicator }
