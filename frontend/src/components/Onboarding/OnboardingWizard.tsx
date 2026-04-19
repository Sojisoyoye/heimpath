/**
 * Onboarding Wizard Component
 * 3-step modal wizard for new users to set goals and get a recommended first action
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calculator,
  Check,
  Compass,
  DollarSign,
  Landmark,
  MapIcon,
  TrendingUp,
} from "lucide-react"
import { useState } from "react"

import { UsersService, type UserUpdateMe } from "@/client"
import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface IProps {
  open: boolean
  onComplete: () => void
}

/******************************************************************************
                              Constants
******************************************************************************/

type Persona = "explorer" | "settler" | "investor"
type Priority =
  | "understand_costs"
  | "find_financing"
  | "start_journey"
  | "evaluate_property"

const PERSONAS: ReadonlyArray<{
  id: Persona
  label: string
  description: string
  icon: typeof Compass
}> = [
  {
    id: "explorer",
    label: "Explorer",
    description:
      "Researching German property from abroad — just getting started",
    icon: Compass,
  },
  {
    id: "settler",
    label: "Settler",
    description: "Already in Germany, ready to buy my first property",
    icon: Building2,
  },
  {
    id: "investor",
    label: "Investor",
    description: "Looking to invest in German real estate for returns",
    icon: TrendingUp,
  },
]

const PRIORITIES: ReadonlyArray<{
  id: Priority
  label: string
  description: string
  icon: typeof Calculator
}> = [
  {
    id: "understand_costs",
    label: "Understand Costs",
    description: "Learn about hidden costs, taxes, and fees",
    icon: DollarSign,
  },
  {
    id: "find_financing",
    label: "Find Financing",
    description: "Check mortgage eligibility as a foreign buyer",
    icon: Landmark,
  },
  {
    id: "start_journey",
    label: "Start My Journey",
    description: "Get a personalized step-by-step buying guide",
    icon: MapIcon,
  },
  {
    id: "evaluate_property",
    label: "Evaluate a Property",
    description: "Analyze a property's costs and potential returns",
    icon: Calculator,
  },
]

const PRIORITY_CONFIG: Record<
  Priority,
  {
    route: string
    search?: Record<string, string>
    cta: string
    detail: string
  }
> = {
  understand_costs: {
    route: "/calculators",
    search: { tab: "hidden-costs" },
    cta: "Calculate Hidden Costs",
    detail:
      "Use our Hidden Costs Calculator to see the real total cost of buying property in any German state — including taxes, notary fees, and agent commissions.",
  },
  find_financing: {
    route: "/calculators",
    search: { tab: "financing" },
    cta: "Check Financing Eligibility",
    detail:
      "Check your mortgage eligibility as a foreign buyer. We'll assess your situation and show which banks are most likely to approve your application.",
  },
  start_journey: {
    route: "/journeys/new",
    cta: "Start My Journey",
    detail:
      "Get a personalised step-by-step guide tailored to your citizenship and situation. We'll walk you through every phase from research to closing.",
  },
  evaluate_property: {
    route: "/calculators",
    search: { tab: "property-evaluation" },
    cta: "Evaluate a Property",
    detail:
      "Found a listing? Enter the details and we'll calculate your monthly costs, cashflow projections, and expected return on investment.",
  },
}

const STEP_TITLES = [
  "What best describes your situation?",
  "What's your top priority right now?",
  "Here's your recommended first step",
] as const

const STEP_DESCRIPTIONS = [
  "This helps us personalise your experience.",
  "We'll point you to the best starting point.",
  "You can always explore other features from the dashboard.",
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Step indicator dots. */
function StepIndicator(props: Readonly<{ current: number; total: number }>) {
  const { current, total } = props

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={`step-${i + 1}`}
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            i <= current ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  )
}

/** Selectable option card. */
function OptionCard(
  props: Readonly<{
    icon: typeof Compass
    label: string
    description: string
    selected: boolean
    onClick: () => void
  }>,
) {
  const { icon: Icon, label, description, selected, onClick } = props

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:border-muted-foreground/30 hover:bg-muted/50",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          selected ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {selected && <Check className="mt-1 h-5 w-5 shrink-0 text-primary" />}
    </button>
  )
}

/** Step 1: Choose persona. */
function PersonaStep(
  props: Readonly<{
    selected: Persona | null
    onSelect: (persona: Persona) => void
  }>,
) {
  const { selected, onSelect } = props

  return (
    <div className="space-y-3">
      {PERSONAS.map((persona) => (
        <OptionCard
          key={persona.id}
          icon={persona.icon}
          label={persona.label}
          description={persona.description}
          selected={selected === persona.id}
          onClick={() => onSelect(persona.id)}
        />
      ))}
    </div>
  )
}

/** Step 2: Choose priority. */
function PriorityStep(
  props: Readonly<{
    selected: Priority | null
    onSelect: (priority: Priority) => void
  }>,
) {
  const { selected, onSelect } = props

  return (
    <div className="space-y-3">
      {PRIORITIES.map((priority) => (
        <OptionCard
          key={priority.id}
          icon={priority.icon}
          label={priority.label}
          description={priority.description}
          selected={selected === priority.id}
          onClick={() => onSelect(priority.id)}
        />
      ))}
    </div>
  )
}

/** Step 3: Recommended action. */
function RecommendationStep(props: Readonly<{ priority: Priority }>) {
  const { priority } = props
  const Icon = PRIORITIES.find((p) => p.id === priority)?.icon ?? BookOpen
  const config = PRIORITY_CONFIG[priority]

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{config.cta}</h3>
        <p className="text-sm text-muted-foreground">{config.detail}</p>
      </div>
    </div>
  )
}

/** Default component. 3-step onboarding wizard modal. */
function OnboardingWizard(props: Readonly<IProps>) {
  const { open, onComplete } = props
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const [step, setStep] = useState(0)
  const [persona, setPersona] = useState<Persona | null>(null)
  const [priority, setPriority] = useState<Priority | null>(null)
  const [navigateTo, setNavigateTo] = useState<Priority | null>(null)

  const mutation = useMutation({
    mutationFn: (data: UserUpdateMe) =>
      UsersService.updateUserMe({ requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      onComplete()
      if (navigateTo) {
        const config = PRIORITY_CONFIG[navigateTo]
        navigate({
          to: config.route,
          ...(config.search ? { search: config.search } : {}),
        })
      }
    },
    onError: handleError.bind(showErrorToast),
  })

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleComplete = () => {
    setNavigateTo(null)
    mutation.mutate({
      onboarding_completed: true,
      onboarding_persona: persona,
    })
  }

  const handleGoToAction = () => {
    if (!priority) return
    setNavigateTo(priority)
    mutation.mutate({
      onboarding_completed: true,
      onboarding_persona: persona,
    })
  }

  const canProceed =
    (step === 0 && persona !== null) ||
    (step === 1 && priority !== null) ||
    step === 2

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
          <DialogDescription>{STEP_DESCRIPTIONS[step]}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {step === 0 && (
            <PersonaStep selected={persona} onSelect={setPersona} />
          )}
          {step === 1 && (
            <PriorityStep selected={priority} onSelect={setPriority} />
          )}
          {step === 2 && priority && <RecommendationStep priority={priority} />}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                Back
              </Button>
            )}
            {step === 0 && (
              <Button variant="ghost" size="sm" onClick={handleComplete}>
                Skip
              </Button>
            )}
          </div>

          <StepIndicator current={step} total={3} />

          <div>
            {step < 2 ? (
              <Button size="sm" onClick={handleNext} disabled={!canProceed}>
                Next
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleGoToAction}>
                Let's Go
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { OnboardingWizard }
