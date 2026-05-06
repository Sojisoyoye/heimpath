/**
 * Journey Type Selector Component
 * Allows user to select between buying a property or renting an apartment
 */

import { Building2, Key } from "lucide-react"
import { cn } from "@/common/utils"
import type { JourneyType } from "@/models/journey"

interface IProps {
  value?: JourneyType
  onChange: (value: JourneyType) => void
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const JOURNEY_TYPE_OPTIONS = [
  {
    value: "buying" as const,
    label: "Buy Property",
    description:
      "You want to purchase a property in Germany. We'll guide you through research, financing, the buying process, and ownership.",
    Icon: Building2,
  },
  {
    value: "rental" as const,
    label: "Rent Apartment",
    description:
      "You're looking to rent an apartment in Germany. We'll guide you through searching, applying, reviewing the lease, and moving in.",
    Icon: Key,
  },
]

/******************************************************************************
                              Components
******************************************************************************/

/** Single journey type option card. */
function JourneyTypeOption(props: {
  option: (typeof JOURNEY_TYPE_OPTIONS)[number]
  isSelected: boolean
  onSelect: () => void
}) {
  const { option, isSelected, onSelect } = props
  const { Icon } = option

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border-2 p-6 transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-left",
        isSelected
          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
          : "border-muted",
      )}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={cn(
            "h-8 w-8",
            isSelected ? "text-blue-600" : "text-muted-foreground",
          )}
        />
        <span
          className={cn(
            "text-lg font-medium",
            isSelected ? "text-blue-600" : "text-foreground",
          )}
        >
          {option.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{option.description}</p>
    </button>
  )
}

/** Default component. Journey type selector (buy vs rent). */
function JourneyTypeSelector(props: IProps) {
  const { value, onChange, className } = props

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold">What would you like to do?</h3>
        <p className="text-sm text-muted-foreground">
          Choose whether you want to buy a property or rent an apartment in
          Germany
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {JOURNEY_TYPE_OPTIONS.map((option) => (
          <JourneyTypeOption
            key={option.value}
            option={option}
            isSelected={value === option.value}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { JourneyTypeSelector }
