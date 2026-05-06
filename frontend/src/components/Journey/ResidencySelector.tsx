/**
 * Residency Selector Component
 * Allows user to select their residency status
 */

import { Flag, Globe, Home, Info, Plane } from "lucide-react"
import { RESIDENCY_STATUS_OPTIONS } from "@/common/constants"
import { cn } from "@/common/utils"
import type { ResidencyStatus } from "@/models/journey"

interface IProps {
  value?: ResidencyStatus
  onChange: (value: ResidencyStatus) => void
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const RESIDENCY_ICONS: Record<ResidencyStatus, typeof Globe> = {
  german_citizen: Flag,
  eu_citizen: Globe,
  non_eu_resident: Home,
  non_resident: Plane,
}

const RESIDENCY_DESCRIPTIONS: Record<ResidencyStatus, string> = {
  german_citizen:
    "You have German citizenship. Full access to all financing options.",
  eu_citizen:
    "You're a citizen of an EU/EEA country. Similar rights to German citizens for property purchase.",
  non_eu_resident:
    "You live in Germany but are not an EU citizen. May need additional documentation for financing.",
  non_resident:
    "You live outside Germany. Special considerations for remote buying and financing.",
}

const RESIDENCY_NOTES: Record<ResidencyStatus, string | null> = {
  german_citizen: null,
  eu_citizen: null,
  non_eu_resident:
    "As a non-EU resident, you'll need to provide additional documentation such as residence permit, employment contract, and German tax returns for mortgage applications.",
  non_resident:
    "As a non-resident buyer, you can still purchase property in Germany. We'll guide you through remote buying processes, notary requirements, and international financing options.",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Single residency option. */
function ResidencyOption(props: {
  option: (typeof RESIDENCY_STATUS_OPTIONS)[number]
  isSelected: boolean
  onSelect: () => void
}) {
  const { option, isSelected, onSelect } = props
  const Icon = RESIDENCY_ICONS[option.value as ResidencyStatus]
  const description = RESIDENCY_DESCRIPTIONS[option.value as ResidencyStatus]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-start gap-4 rounded-lg border-2 p-5 transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-left w-full",
        isSelected
          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
          : "border-muted",
      )}
    >
      <Icon
        className={cn(
          "h-6 w-6 shrink-0 mt-0.5",
          isSelected ? "text-blue-600" : "text-muted-foreground",
        )}
      />
      <div className="space-y-1">
        <span
          className={cn(
            "font-medium block",
            isSelected ? "text-blue-600" : "text-foreground",
          )}
        >
          {option.label}
        </span>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}

/** Default component. Residency status selector. */
function ResidencySelector(props: IProps) {
  const { value, onChange, className } = props

  const selectedNote = value ? RESIDENCY_NOTES[value] : null

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold">What's your residency status?</h3>
        <p className="text-sm text-muted-foreground">
          This helps us personalize your journey based on your situation
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {RESIDENCY_STATUS_OPTIONS.map((option) => (
          <ResidencyOption
            key={option.value}
            option={option}
            isSelected={value === option.value}
            onSelect={() => onChange(option.value as ResidencyStatus)}
          />
        ))}
      </div>

      {selectedNote && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <Info className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-100">
              Important information
            </p>
            <p className="text-amber-800 dark:text-amber-200">{selectedNote}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ResidencySelector }
