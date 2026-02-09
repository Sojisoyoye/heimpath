/**
 * Property Type Selector Component
 * Allows user to select property type for their journey
 */

import { Building, Home, Building2, Store, MapPin } from "lucide-react"

import { cn } from "@/common/utils"
import { PROPERTY_TYPES } from "@/common/constants"
import type { PropertyType } from "@/models/journey"

interface IProps {
  value?: PropertyType
  onChange: (value: PropertyType) => void
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const PROPERTY_ICONS: Record<PropertyType, typeof Home> = {
  apartment: Building,
  house: Home,
  multi_family: Building2,
  commercial: Store,
  land: MapPin,
}

/******************************************************************************
                              Components
******************************************************************************/

/** Single property type option. */
function PropertyOption(props: {
  type: (typeof PROPERTY_TYPES)[number]
  isSelected: boolean
  onSelect: () => void
}) {
  const { type, isSelected, onSelect } = props
  const Icon = PROPERTY_ICONS[type.value as PropertyType]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
        isSelected
          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
          : "border-muted"
      )}
    >
      <Icon
        className={cn(
          "h-10 w-10",
          isSelected ? "text-blue-600" : "text-muted-foreground"
        )}
      />
      <span
        className={cn(
          "text-sm font-medium text-center",
          isSelected ? "text-blue-600" : "text-foreground"
        )}
      >
        {type.label}
      </span>
    </button>
  )
}

/** Default component. Property type selector grid. */
function PropertyTypeSelector(props: IProps) {
  const { value, onChange, className } = props

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold">What type of property?</h3>
        <p className="text-sm text-muted-foreground">
          Select the type of property you're looking to buy in Germany
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {PROPERTY_TYPES.map((type) => (
          <PropertyOption
            key={type.value}
            type={type}
            isSelected={value === type.value}
            onSelect={() => onChange(type.value as PropertyType)}
          />
        ))}
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyTypeSelector }
