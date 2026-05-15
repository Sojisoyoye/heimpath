/**
 * Phase Completion CTA
 * Full-width celebration card shown when all steps in a phase are complete.
 * Displays phase-specific stats drawn from the journey context.
 */

import { ArrowRight, Building2, CheckCircle2, PartyPopper } from "lucide-react"

import {
  FINANCING_TYPES,
  GERMAN_STATES,
  JOURNEY_PHASES,
} from "@/common/constants"
import { cn, formatEur } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { JourneyPhase, JourneyPublic } from "@/models/journey"
import { useJourneyContext } from "./JourneyContext"

interface IProps {
  currentPhase: JourneyPhase
  /** Keys of phases that have steps in this journey (determines next-phase target). */
  activePhaseKeys: string[]
  onContinue: (nextPhase: JourneyPhase) => void
  /**
   * Override the canonical next phase. When provided, this phase is used as
   * the navigation target instead of the canonical JOURNEY_PHASES successor.
   * Use this to navigate to the phase containing the first incomplete step
   * (by step_number), which may differ from the canonical order for journeys
   * where steps span phases non-sequentially (e.g. rent_out investors).
   */
  nextPhaseKey?: JourneyPhase
  /** Called when the user clicks "Add to Portfolio" on the all-phases-complete card. */
  onAddToPortfolio?: () => void
}

interface IStatCardProps {
  stat: StatItem
  index: number
}

interface StatItem {
  label: string
  value: string
}

/******************************************************************************
                              Constants
******************************************************************************/

// Max stat mini-cards shown in the celebration card.
const MAX_DISPLAY_STATS = 3

// Stagger delay increment per stat card (ms). Keeps total duration under ~300ms.
const STAT_ANIMATION_DELAY_MS = 80

type PhaseStyle = {
  gradient: string
  border: string
  iconBg: string
  iconColor: string
  headingColor: string
  bodyColor: string
}

/**
 * Per-phase visual style for the celebration card.
 * Uses the same color palette as PHASE_COLORS in constants/index.ts but
 * extends it with gradient, icon, and text colour variants for this card.
 */
const PHASE_STYLES: Record<string, PhaseStyle> = {
  research: {
    gradient:
      "bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background",
    border: "border-blue-200 dark:border-blue-800",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    headingColor: "text-blue-900 dark:text-blue-100",
    bodyColor: "text-blue-700 dark:text-blue-300",
  },
  preparation: {
    gradient:
      "bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background",
    border: "border-purple-200 dark:border-purple-800",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
    iconColor: "text-purple-600 dark:text-purple-400",
    headingColor: "text-purple-900 dark:text-purple-100",
    bodyColor: "text-purple-700 dark:text-purple-300",
  },
  buying: {
    gradient:
      "bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background",
    border: "border-orange-200 dark:border-orange-800",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
    iconColor: "text-orange-600 dark:text-orange-400",
    headingColor: "text-orange-900 dark:text-orange-100",
    bodyColor: "text-orange-700 dark:text-orange-300",
  },
  closing: {
    gradient:
      "bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background",
    border: "border-green-200 dark:border-green-800",
    iconBg: "bg-green-100 dark:bg-green-900/50",
    iconColor: "text-green-600 dark:text-green-400",
    headingColor: "text-green-900 dark:text-green-100",
    bodyColor: "text-green-700 dark:text-green-300",
  },
  ownership: {
    gradient:
      "bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background",
    border: "border-amber-200 dark:border-amber-800",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    headingColor: "text-amber-900 dark:text-amber-100",
    bodyColor: "text-amber-700 dark:text-amber-300",
  },
  rental_setup: {
    gradient:
      "bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/20 dark:to-background",
    border: "border-teal-200 dark:border-teal-800",
    iconBg: "bg-teal-100 dark:bg-teal-900/50",
    iconColor: "text-teal-600 dark:text-teal-400",
    headingColor: "text-teal-900 dark:text-teal-100",
    bodyColor: "text-teal-700 dark:text-teal-300",
  },
  rental_search: {
    gradient:
      "bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background",
    border: "border-indigo-200 dark:border-indigo-800",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    headingColor: "text-indigo-900 dark:text-indigo-100",
    bodyColor: "text-indigo-700 dark:text-indigo-300",
  },
  rental_application: {
    gradient:
      "bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background",
    border: "border-cyan-200 dark:border-cyan-800",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/50",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    headingColor: "text-cyan-900 dark:text-cyan-100",
    bodyColor: "text-cyan-700 dark:text-cyan-300",
  },
  rental_contract: {
    gradient:
      "bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-background",
    border: "border-rose-200 dark:border-rose-800",
    iconBg: "bg-rose-100 dark:bg-rose-900/50",
    iconColor: "text-rose-600 dark:text-rose-400",
    headingColor: "text-rose-900 dark:text-rose-100",
    bodyColor: "text-rose-700 dark:text-rose-300",
  },
  rental_move_in: {
    gradient:
      "bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background",
    border: "border-emerald-200 dark:border-emerald-800",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    headingColor: "text-emerald-900 dark:text-emerald-100",
    bodyColor: "text-emerald-700 dark:text-emerald-300",
  },
}

const PHASE_MESSAGES: Record<string, string> = {
  research:
    "You've laid the groundwork — your goals are clear and the market makes sense.",
  preparation:
    "You're financially ready. It's time to start searching for the right property.",
  buying:
    "You've committed to your property. The legal process is now underway.",
  closing: "The paperwork is signed and the keys are almost yours.",
  ownership:
    "You're a German property owner. Your next steps are getting settled in.",
  rental_setup:
    "Your search criteria are set. It's time to find your new home.",
  rental_search:
    "You found the right place. Now it's time to put in your application.",
  rental_application: "Your application package is ready. One more step to go.",
  rental_contract: "Your lease is reviewed and ready to sign.",
  rental_move_in: "You're all moved in — welcome to your new home!",
}

/******************************************************************************
                              Functions
******************************************************************************/

/**
 * Compute up to MAX_DISPLAY_STATS contextual stats for the completed phase.
 * Only includes stats for which data is present on the journey.
 */
function _buildPhaseStats(
  journey: JourneyPublic,
  phase: JourneyPhase,
): StatItem[] {
  const phaseSteps = journey.steps.filter((s) => s.phase === phase)
  const completedCount = phaseSteps.filter(
    (s) => s.status === "completed" || s.status === "skipped",
  ).length

  const stateName =
    GERMAN_STATES.find((s) => s.code === journey.property_location)?.name ??
    journey.property_location

  // Use the label up to the first opening parenthesis to avoid displaying
  // the German term in brackets (e.g. "Cash purchase" instead of "Cash purchase (Barkauf)").
  const financingLabel = FINANCING_TYPES.find(
    (f) => f.value === journey.financing_type,
  )?.label.split(" (")[0]

  const stats: StatItem[] = []

  if (phase === "research") {
    if (journey.budget_euros)
      stats.push({ label: "Budget", value: formatEur(journey.budget_euros) })
    if (stateName) stats.push({ label: "Location", value: stateName })
    if (journey.market_insights?.avg_price_per_sqm)
      stats.push({
        label: "Market avg/m²",
        value: `${formatEur(journey.market_insights.avg_price_per_sqm)}/m²`,
      })
  } else if (phase === "preparation") {
    if (financingLabel)
      stats.push({ label: "Financing", value: financingLabel })
    if (stateName) stats.push({ label: "Location", value: stateName })
    stats.push({
      label: "Steps done",
      value: `${completedCount} of ${phaseSteps.length}`,
    })
  } else {
    if (stateName) stats.push({ label: "Location", value: stateName })
    stats.push({
      label: "Steps done",
      value: `${completedCount} of ${phaseSteps.length}`,
    })
    if (financingLabel)
      stats.push({ label: "Financing", value: financingLabel })
  }

  return stats.slice(0, MAX_DISPLAY_STATS)
}

/******************************************************************************
                              Components
******************************************************************************/

/** A single stat mini-card inside the celebration card. */
function StatCard(props: Readonly<IStatCardProps>) {
  const { stat, index } = props
  return (
    <div
      className="animate-in fade-in-0 zoom-in-95 min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 shadow-sm dark:bg-background"
      style={{
        animationDelay: `${(index + 1) * STAT_ANIMATION_DELAY_MS}ms`,
        animationFillMode: "both",
      }}
    >
      <p className="truncate text-xs text-muted-foreground">{stat.label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold">{stat.value}</p>
    </div>
  )
}

/** Default component. Phase completion celebration card. */
function PhaseCompletionCta(props: Readonly<IProps>) {
  const {
    currentPhase,
    activePhaseKeys,
    onContinue,
    nextPhaseKey,
    onAddToPortfolio,
  } = props

  const { journey } = useJourneyContext()

  // Only consider phases that actually have steps in this journey, preserving
  // canonical JOURNEY_PHASES order.
  const visiblePhases = JOURNEY_PHASES.filter((p) =>
    activePhaseKeys.includes(p.key),
  )

  const phaseIndex = visiblePhases.findIndex((p) => p.key === currentPhase)
  const canonicalIsLast =
    phaseIndex === -1 || phaseIndex === visiblePhases.length - 1
  const canonicalNext = canonicalIsLast ? null : visiblePhases[phaseIndex + 1]

  // Use the explicit override if provided, otherwise fall back to the canonical
  // successor. The override ensures users navigate to the section that actually
  // contains their next incomplete step, rather than the canonical next phase
  // (which can differ when steps span phases non-sequentially).
  const nextPhase = nextPhaseKey
    ? (visiblePhases.find((p) => p.key === nextPhaseKey) ?? canonicalNext)
    : canonicalNext
  const isLastPhase = nextPhase === null

  const currentLabel = visiblePhases[phaseIndex]?.label ?? currentPhase
  const style = PHASE_STYLES[currentPhase] ?? PHASE_STYLES.research

  const displayStats = _buildPhaseStats(journey, currentPhase)

  if (isLastPhase) {
    return (
      <Card className="animate-in fade-in-0 zoom-in-95 border-green-200 bg-gradient-to-br from-green-50 to-white duration-200 dark:border-green-900 dark:from-green-950/20 dark:to-background">
        <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
            <PartyPopper className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-green-900 dark:text-green-100">
              All phases complete!
            </h3>
            <p className="mt-0.5 text-sm text-green-700 dark:text-green-300">
              Congratulations — you've completed every phase of your property
              journey.
            </p>
          </div>
          {onAddToPortfolio && (
            <Button className="shrink-0 gap-2" onClick={onAddToPortfolio}>
              <Building2 className="h-4 w-4" />
              Add to Portfolio
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "animate-in fade-in-0 zoom-in-95 overflow-hidden duration-200",
        style.gradient,
        style.border,
      )}
    >
      <CardContent className="flex flex-col gap-4 py-6">
        {/* Header row */}
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              style.iconBg,
            )}
          >
            <CheckCircle2 className={cn("h-6 w-6", style.iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn("text-base font-semibold", style.headingColor)}>
              {currentLabel} phase complete
            </h3>
            <p className={cn("mt-0.5 text-sm", style.bodyColor)}>
              {PHASE_MESSAGES[currentPhase] ??
                "Great progress — ready to move on?"}
            </p>
          </div>
        </div>

        {/* Phase stats */}
        {displayStats.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            {displayStats.map((stat, i) => (
              <StatCard key={stat.label} stat={stat} index={i} />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="flex justify-center sm:justify-end">
          <Button
            className="w-full gap-2 sm:w-auto"
            onClick={() => onContinue(nextPhase!.key as JourneyPhase)}
          >
            Begin {nextPhase?.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PhaseCompletionCta }
