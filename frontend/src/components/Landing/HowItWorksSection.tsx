import {
  Building2,
  ClipboardList,
  Handshake,
  Home,
  KeyRound,
  Search,
} from "lucide-react"
import { AnimateIn } from "./AnimateIn"
import {
  BuyingIllustration,
  ClosingIllustration,
  OwnershipIllustration,
  PreparationIllustration,
  RentalSetupIllustration,
  ResearchIllustration,
} from "./PhaseIllustrations"

/******************************************************************************
                              Constants
******************************************************************************/

const PHASES = [
  {
    icon: Search,
    illustration: ResearchIllustration,
    title: "Research",
    description:
      "Explore the market, understand requirements, and identify the right location for your investment.",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    ring: "ring-blue-200 dark:ring-blue-800",
  },
  {
    icon: ClipboardList,
    illustration: PreparationIllustration,
    title: "Preparation",
    description:
      "Gather documents, secure financing, and prepare for the buying process with expert checklists.",
    color:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
    ring: "ring-purple-200 dark:ring-purple-800",
  },
  {
    icon: Handshake,
    illustration: BuyingIllustration,
    title: "Buying",
    description:
      "Navigate offers, notary appointments, and contract signing with step-by-step guidance.",
    color:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
    ring: "ring-orange-200 dark:ring-orange-800",
  },
  {
    icon: KeyRound,
    illustration: ClosingIllustration,
    title: "Closing",
    description:
      "Complete registration, handle final payments, and receive the keys to your new property.",
    color:
      "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
    ring: "ring-green-200 dark:ring-green-800",
  },
  {
    icon: Home,
    illustration: OwnershipIllustration,
    title: "Ownership",
    description:
      "Handle land registry, insurance, tax setup, and property management after your purchase.",
    color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
    ring: "ring-teal-200 dark:ring-teal-800",
  },
  {
    icon: Building2,
    illustration: RentalSetupIllustration,
    title: "Rental Setup",
    description:
      "Set up rental operations, understand landlord law, analyse yields, and onboard tenants.",
    color:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    ring: "ring-emerald-200 dark:ring-emerald-800",
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Single phase step in the timeline. */
function PhaseStep(props: { phase: (typeof PHASES)[number]; index: number }) {
  const { phase, index } = props
  const Icon = phase.icon
  const Illustration = phase.illustration

  return (
    <div className="flex flex-1 flex-col items-center text-center">
      {/* Illustration */}
      <div className="mb-3 h-16 w-16">
        <Illustration />
      </div>

      {/* Step number + icon */}
      <div className="relative">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full ${phase.color} ring-4 ${phase.ring}`}
        >
          <Icon className="h-7 w-7" />
        </div>
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
          {index + 1}
        </span>
      </div>

      <h3 className="mt-4 font-semibold">{phase.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{phase.description}</p>
    </div>
  )
}

/** Default component. How it works timeline section. */
function HowItWorksSection() {
  return (
    <section className="bg-muted/50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimateIn>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Six phases guide you from first research to managing your
              portfolio.
            </p>
          </div>
        </AnimateIn>

        {/* Desktop: horizontal timeline */}
        <div className="relative hidden gap-4 lg:flex">
          {/* Dashed connector line — aligned with icon circles below illustrations */}
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-[6.5rem] border-t-2 border-dashed border-muted-foreground/25" />

          {PHASES.map((phase, i) => (
            <AnimateIn
              key={phase.title}
              delayMs={(i + 1) * 150}
              className="flex-1"
            >
              <PhaseStep phase={phase} index={i} />
            </AnimateIn>
          ))}
        </div>

        {/* Tablet: 3-column grid */}
        <div className="hidden grid-cols-3 gap-6 md:grid lg:hidden">
          {PHASES.map((phase, i) => (
            <AnimateIn key={phase.title} delayMs={(i + 1) * 150}>
              <PhaseStep phase={phase} index={i} />
            </AnimateIn>
          ))}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="flex flex-col gap-8 md:hidden">
          {PHASES.map((phase, i) => {
            const Icon = phase.icon
            const Illustration = phase.illustration
            return (
              <AnimateIn key={phase.title} delayMs={(i + 1) * 100}>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="mb-2 h-10 w-10">
                      <Illustration />
                    </div>
                    <div
                      className={`relative flex h-12 w-12 items-center justify-center rounded-full ${phase.color} ring-4 ${phase.ring}`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                        {i + 1}
                      </span>
                    </div>
                    {i < PHASES.length - 1 && (
                      <div className="mt-2 h-full w-px border-l-2 border-dashed border-muted-foreground/25" />
                    )}
                  </div>
                  <div className="self-center pb-4">
                    <h3 className="font-semibold">{phase.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {phase.description}
                    </p>
                  </div>
                </div>
              </AnimateIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { HowItWorksSection }
