/**
 * Property Use Selector Component
 * Allows user to select whether they plan to live in or rent out the property
 */

import { Building2, Home } from "lucide-react"
import { cn } from "@/common/utils"

interface IProps {
  value?: "live_in" | "rent_out"
  onChange: (value: "live_in" | "rent_out") => void
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const PROPERTY_USE_OPTIONS = [
  {
    value: "live_in" as const,
    label: "Live in it",
    description:
      "You plan to move in and use the property as your primary or secondary residence.",
    Icon: Home,
  },
  {
    value: "rent_out" as const,
    label: "Rent it out",
    description:
      "You plan to rent the property to tenants as an investment. We'll add landlord-specific guidance to your journey.",
    Icon: Building2,
  },
]

/******************************************************************************
                              Components
******************************************************************************/

/** Single property use option card. */
function PropertyUseOption(props: {
  option: (typeof PROPERTY_USE_OPTIONS)[number]
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

/** Default component. Property use intent selector. */
function PropertyUseSelector(props: IProps) {
  const { value, onChange, className } = props

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold">
          What do you plan to do with the property?
        </h3>
        <p className="text-sm text-muted-foreground">
          This helps us customize your journey with relevant guidance
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PROPERTY_USE_OPTIONS.map((option) => (
          <PropertyUseOption
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

export { PropertyUseSelector }
