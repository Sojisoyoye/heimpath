/**
 * Location Selector Component
 * Allows user to select German state for their property search
 */

import { MapPin, Info } from "lucide-react"

import { cn } from "@/common/utils"
import { GERMAN_STATES } from "@/common/constants"
import { Badge } from "@/components/ui/badge"

interface IProps {
  value?: string
  onChange: (value: string) => void
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Single state option. */
function StateOption(props: {
  state: (typeof GERMAN_STATES)[number]
  isSelected: boolean
  onSelect: () => void
}) {
  const { state, isSelected, onSelect } = props

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border-2 p-4 transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-left",
        isSelected
          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
          : "border-muted"
      )}
    >
      <div className="flex items-center gap-3">
        <MapPin
          className={cn(
            "h-5 w-5 shrink-0",
            isSelected ? "text-blue-600" : "text-muted-foreground"
          )}
        />
        <span
          className={cn(
            "font-medium",
            isSelected ? "text-blue-600" : "text-foreground"
          )}
        >
          {state.name}
        </span>
      </div>
      <Badge variant="outline" className="shrink-0">
        {state.transferTaxRate}% tax
      </Badge>
    </button>
  )
}

/** Default component. German state selector grid. */
function LocationSelector(props: IProps) {
  const { value, onChange, className } = props

  const selectedState = GERMAN_STATES.find((s) => s.code === value)

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold">Where in Germany?</h3>
        <p className="text-sm text-muted-foreground">
          Select the state where you want to buy property
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GERMAN_STATES.map((state) => (
          <StateOption
            key={state.code}
            state={state}
            isSelected={value === state.code}
            onSelect={() => onChange(state.code)}
          />
        ))}
      </div>

      {selectedState && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <Info className="h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Property Transfer Tax in {selectedState.name}
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              The Grunderwerbsteuer (property transfer tax) in{" "}
              {selectedState.name} is {selectedState.transferTaxRate}%. This is
              one of the additional costs you'll pay when purchasing property.
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

export { LocationSelector }
