import { ClipboardList, Handshake, KeyRound, Search } from "lucide-react"

/******************************************************************************
                              Constants
******************************************************************************/

const PHASES = [
  {
    icon: Search,
    title: "Research",
    description:
      "Explore the market, understand requirements, and identify the right location for your investment.",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    ring: "ring-blue-200 dark:ring-blue-800",
  },
  {
    icon: ClipboardList,
    title: "Preparation",
    description:
      "Gather documents, secure financing, and prepare for the buying process with expert checklists.",
    color:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
    ring: "ring-purple-200 dark:ring-purple-800",
  },
  {
    icon: Handshake,
    title: "Buying",
    description:
      "Navigate offers, notary appointments, and contract signing with step-by-step guidance.",
    color:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
    ring: "ring-orange-200 dark:ring-orange-800",
  },
  {
    icon: KeyRound,
    title: "Closing",
    description:
      "Complete registration, handle final payments, and receive the keys to your new property.",
    color:
      "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
    ring: "ring-green-200 dark:ring-green-800",
  },
] as const

/******************************************************************************
                              Components
******************************************************************************/

/** Single phase step in the timeline. */
function PhaseStep(props: { phase: (typeof PHASES)[number]; index: number }) {
  const { phase, index } = props
  const Icon = phase.icon

  return (
    <div className="flex flex-1 flex-col items-center text-center">
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
      <p className="mt-1 max-w-48 text-sm text-muted-foreground">
        {phase.description}
      </p>
    </div>
  )
}

/** Default component. How it works timeline section. */
function HowItWorksSection() {
  return (
    <section className="bg-muted/50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Four phases guide you from first research to getting your keys.
          </p>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="relative hidden gap-8 md:flex">
          {/* Dashed connector line */}
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-8 border-t-2 border-dashed border-muted-foreground/25" />

          {PHASES.map((phase, i) => (
            <PhaseStep key={phase.title} phase={phase} index={i} />
          ))}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="flex flex-col gap-8 md:hidden">
          {PHASES.map((phase, i) => {
            const Icon = phase.icon
            return (
              <div key={phase.title} className="flex gap-4">
                <div className="flex flex-col items-center">
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
                <div className="pb-4">
                  <h3 className="font-semibold">{phase.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {phase.description}
                  </p>
                </div>
              </div>
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
