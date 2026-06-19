/**
 * Phase Icon Navigation
 * Scrollable tab bar for navigating between journey phases.
 * Each tab shows the phase icon, label, and completion status.
 * Used as the primary phase navigation in the journey detail view.
 */

import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  FileCheck,
  FileText,
  Key,
  MapPin,
  ScrollText,
  Settings,
  ShoppingCart,
} from "lucide-react"
import { PHASE_COLORS } from "@/common/constants"
import { cn } from "@/common/utils"

interface IPhaseItem {
  key: string
  label: string
  stepCount: number
  completedSteps: number
}

interface IProps {
  phases: IPhaseItem[]
  activePhase: string
  onPhaseClick: (phase: string) => void
}

/******************************************************************************
                              Constants
******************************************************************************/

const PHASE_ICONS: Record<string, LucideIcon> = {
  research: BookOpen,
  preparation: ClipboardList,
  buying: ShoppingCart,
  closing: FileCheck,
  ownership: Key,
  rental_setup: Settings,
  rental_search: MapPin,
  rental_application: FileText,
  rental_contract: ScrollText,
  rental_move_in: DoorOpen,
}

/******************************************************************************
                              Components
******************************************************************************/

function PhaseIconNav(props: IProps) {
  const { phases, activePhase, onPhaseClick } = props

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {phases.map((phase) => {
          const Icon = PHASE_ICONS[phase.key] ?? BookOpen
          const isActive = activePhase === phase.key
          const isComplete =
            phase.stepCount > 0 && phase.completedSteps === phase.stepCount

          return (
            <button
              key={phase.key}
              type="button"
              aria-label={phase.label}
              aria-pressed={isActive}
              onClick={() => onPhaseClick(phase.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm whitespace-nowrap transition-colors",
                isActive
                  ? cn(
                      PHASE_COLORS[phase.key] ?? "bg-muted text-foreground",
                      "border-current/20 font-medium",
                    )
                  : isComplete
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                    : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{phase.label}</span>
              {isComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
              ) : phase.completedSteps > 0 ? (
                <span className="text-xs opacity-60">
                  {phase.completedSteps}/{phase.stepCount}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PhaseIconNav }
export type { IPhaseItem }
