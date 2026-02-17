/**
 * Financing Selector Component
 * Allows user to select financing type for their property purchase
 */

import { Banknote, Building2, Info, Percent } from "lucide-react"
import { FINANCING_TYPES } from "@/common/constants"
import { cn } from "@/common/utils"
import type { FinancingType } from "@/models/journey"

interface IProps {
  value?: FinancingType
  onChange: (value: FinancingType) => void
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const FINANCING_ICONS: Record<FinancingType, typeof Banknote> = {
  cash: Banknote,
  mortgage: Building2,
  mixed: Percent,
}

const FINANCING_DESCRIPTIONS: Record<FinancingType, string> = {
  cash: "Full payment without bank financing. Faster closing and stronger negotiating position.",
  mortgage:
    "Bank financing for the property. You'll need to arrange mortgage pre-approval.",
  mixed:
    "Combination of personal funds and bank financing. Common for larger purchases.",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Single financing option. */
function FinancingOption(props: {
  type: (typeof FINANCING_TYPES)[number]
  isSelected: boolean
  onSelect: () => void
}) {
  const { type, isSelected, onSelect } = props
  const Icon = FINANCING_ICONS[type.value as FinancingType]
  const description = FINANCING_DESCRIPTIONS[type.value as FinancingType]

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
          {type.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  )
}

/** Default component. Financing type selector. */
function FinancingSelector(props: IProps) {
  const { value, onChange, className } = props

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold">How will you finance?</h3>
        <p className="text-sm text-muted-foreground">
          Select your preferred financing method
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {FINANCING_TYPES.map((type) => (
          <FinancingOption
            key={type.value}
            type={type}
            isSelected={value === type.value}
            onSelect={() => onChange(type.value as FinancingType)}
          />
        ))}
      </div>

      {value === "mortgage" && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <Info className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-100">
              Mortgage financing for non-residents
            </p>
            <p className="text-amber-800 dark:text-amber-200">
              German banks typically require 20-40% down payment for
              non-residents. We'll guide you through the mortgage process and
              required documentation.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FinancingSelector }
