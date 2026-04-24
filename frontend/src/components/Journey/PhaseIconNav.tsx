/**
 * Phase Icon Navigation
 * Shared row of icon buttons for navigating between journey phases.
 * Used in both list view (scroll-to) and tab view (filter).
 */

import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface IPhaseItem {
  key: string
  label: string
  stepCount: number
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
    <div className="flex items-center gap-1">
      {phases.map((phase) => {
        const Icon = PHASE_ICONS[phase.key] ?? BookOpen
        const isActive = activePhase === phase.key

        return (
          <Tooltip key={phase.key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onPhaseClick(phase.key)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                  isActive
                    ? cn(PHASE_COLORS[phase.key], "border-current/20")
                    : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              <span className="font-medium">{phase.label}</span>
              <span className="ml-1.5 opacity-70">
                · {phase.stepCount} {phase.stepCount === 1 ? "step" : "steps"}
              </span>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PhaseIconNav }
export type { IPhaseItem }
