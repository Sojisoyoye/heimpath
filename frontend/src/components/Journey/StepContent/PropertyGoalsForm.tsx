/**
 * Property Goals Form Component
 * Interactive form for Step 1: Define Your Property Goals
 */

import {
  Accessibility,
  Building2,
  Car,
  Check,
  ChefHat,
  Dog,
  Flower2,
  Hammer,
  Home,
  Leaf,
  Package,
  Sun,
  Train,
  Volume2,
} from "lucide-react"
import { useEffect, useState } from "react"
import {
  BATHROOM_OPTIONS,
  FLOOR_OPTIONS,
  MARKET_DATA_BY_STATE,
  PROPERTY_FEATURES,
  PROPERTY_TYPES,
  PROPERTY_USE_OPTIONS,
  ROOM_OPTIONS,
} from "@/common/constants"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUpdatePropertyGoals } from "@/hooks/mutations/useJourneyMutations"
import type { PropertyGoals } from "@/models/journey"
import { BudgetInput } from "../BudgetInput"

interface IProps {
  journeyId: string
  initialGoals?: PropertyGoals
  propertyLocation?: string
  onComplete?: () => void
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const FEATURE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  balcony: Sun,
  garden: Flower2,
  parking: Car,
  storage: Package,
  modern_kitchen: ChefHat,
  energy_efficient: Leaf,
  new_building: Building2,
  renovated: Hammer,
  quiet_location: Volume2,
  good_transport: Train,
  wheelchair_accessible: Accessibility,
  pets_allowed: Dog,
}

/******************************************************************************
                              Components
******************************************************************************/

/** Selection button for single choice options. */
function SelectionButton(props: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  const { selected, onClick, children, className } = props

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-md border-2 px-3 py-2 text-sm font-medium transition-all",
        selected
          ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
          : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/50",
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Feature checkbox item. */
function FeatureCheckbox(props: {
  feature: { value: string; label: string }
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const { feature, checked, onChange } = props
  const Icon = FEATURE_ICONS[feature.value] || Home
  const checkboxId = `feature-${feature.value}`

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 transition-all",
        checked
          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
          : "border-muted-foreground/20 hover:border-muted-foreground/40",
      )}
    >
      <Checkbox id={checkboxId} checked={checked} onCheckedChange={onChange} />
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-xs font-medium">{feature.label}</span>
    </label>
  )
}

/** Default component. Property goals form. */
function PropertyGoalsForm(props: IProps) {
  const { journeyId, initialGoals, propertyLocation, onComplete, className } =
    props

  const [goals, setGoals] = useState<PropertyGoals>({
    preferred_property_type: initialGoals?.preferred_property_type || "",
    budget_min_euros: initialGoals?.budget_min_euros,
    budget_max_euros: initialGoals?.budget_max_euros,
    min_rooms: initialGoals?.min_rooms || undefined,
    min_bathrooms: initialGoals?.min_bathrooms || undefined,
    preferred_floor: initialGoals?.preferred_floor || "",
    has_elevator_required: initialGoals?.has_elevator_required || false,
    features: initialGoals?.features || [],
    additional_notes: initialGoals?.additional_notes || "",
    property_use: initialGoals?.property_use,
    preferred_area: initialGoals?.preferred_area || "",
    is_completed: initialGoals?.is_completed || false,
  })

  const { mutate: updateGoals, isPending } = useUpdatePropertyGoals(journeyId)

  // Update local state when initialGoals changes
  useEffect(() => {
    if (initialGoals) {
      setGoals({
        preferred_property_type: initialGoals.preferred_property_type || "",
        budget_min_euros: initialGoals.budget_min_euros,
        budget_max_euros: initialGoals.budget_max_euros,
        min_rooms: initialGoals.min_rooms,
        min_bathrooms: initialGoals.min_bathrooms,
        preferred_floor: initialGoals.preferred_floor || "",
        has_elevator_required: initialGoals.has_elevator_required || false,
        features: initialGoals.features || [],
        additional_notes: initialGoals.additional_notes || "",
        property_use: initialGoals.property_use,
        preferred_area: initialGoals.preferred_area || "",
        is_completed: initialGoals.is_completed || false,
      })
    }
  }, [initialGoals])

  // Floor/elevator are irrelevant for houses and land
  const isFloorRelevant =
    goals.preferred_property_type !== "house" &&
    goals.preferred_property_type !== "land"

  const handlePropertyTypeChange = (value: string) => {
    setGoals((prev) => {
      const floorIrrelevant = value === "house" || value === "land"
      return {
        ...prev,
        preferred_property_type: value,
        // Clear floor and elevator when switching to a type without floors
        ...(floorIrrelevant && {
          preferred_floor: "",
          has_elevator_required: false,
        }),
      }
    })
  }

  const handleFeatureToggle = (feature: string, checked: boolean) => {
    setGoals((prev) => ({
      ...prev,
      features: checked
        ? [...(prev.features || []), feature]
        : (prev.features || []).filter((f) => f !== feature),
    }))
  }

  const handleSave = () => {
    updateGoals(
      { ...goals, is_completed: true },
      {
        onSuccess: () => {
          setGoals((prev) => ({ ...prev, is_completed: true }))
          onComplete?.()
        },
      },
    )
  }

  const hasMinimumSelection =
    goals.preferred_property_type ||
    goals.min_rooms ||
    (goals.features?.length ?? 0) > 0

  return (
    <div className={cn("min-w-0 space-y-4", className)}>
      <div className="flex items-center gap-2 rounded-md bg-blue-50 p-3 dark:bg-blue-950/30">
        <Home className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold">
          Define Your Property Goals
        </span>
        {goals.is_completed && (
          <Check className="ml-auto h-5 w-5 shrink-0 text-green-600" />
        )}
      </div>
      {/* Property Use */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          What do you plan to do with this property?
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {PROPERTY_USE_OPTIONS.map((option) => (
            <SelectionButton
              key={option.value}
              selected={goals.property_use === option.value}
              onClick={() =>
                setGoals((prev) => ({
                  ...prev,
                  property_use: option.value,
                }))
              }
            >
              {option.label}
            </SelectionButton>
          ))}
        </div>
      </div>

      {/* Preferred Area */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Preferred Area
          <span className="ml-1 font-normal text-muted-foreground">
            (optional)
          </span>
        </Label>
        <Input
          placeholder="e.g. Munich, Kreuzberg..."
          value={goals.preferred_area || ""}
          onChange={(e) =>
            setGoals((prev) => ({
              ...prev,
              preferred_area: e.target.value,
            }))
          }
        />
        {propertyLocation &&
          MARKET_DATA_BY_STATE[propertyLocation]?.hotspots && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground self-center">
                Suggestions:
              </span>
              {MARKET_DATA_BY_STATE[propertyLocation].hotspots.map(
                (hotspot) => (
                  <Badge
                    key={hotspot}
                    variant={
                      goals.preferred_area?.toLowerCase() ===
                      hotspot.toLowerCase()
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer text-xs"
                    onClick={() =>
                      setGoals((prev) => ({
                        ...prev,
                        preferred_area: hotspot,
                      }))
                    }
                  >
                    {hotspot}
                  </Badge>
                ),
              )}
            </div>
          )}
      </div>

      {/* Property Type — inline select */}
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <Label className="shrink-0 text-sm font-medium">Property Type</Label>
        <Select
          value={goals.preferred_property_type}
          onValueChange={handlePropertyTypeChange}
        >
          <SelectTrigger className="w-full min-w-0 sm:w-auto sm:flex-1">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Budget */}
      <BudgetInput
        budgetMin={goals.budget_min_euros}
        budgetMax={goals.budget_max_euros}
        onBudgetMinChange={(v) =>
          setGoals((prev) => ({ ...prev, budget_min_euros: v }))
        }
        onBudgetMaxChange={(v) =>
          setGoals((prev) => ({ ...prev, budget_max_euros: v }))
        }
      />

      {/* Min. Rooms — inline */}
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <Label className="shrink-0 text-sm font-medium">Min. Rooms</Label>
        <Select
          value={goals.min_rooms?.toString() ?? ""}
          onValueChange={(v) =>
            setGoals((prev) => ({ ...prev, min_rooms: Number(v) }))
          }
        >
          <SelectTrigger className="w-full min-w-0 sm:w-auto sm:flex-1">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            {ROOM_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Min. Bathrooms — inline */}
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <Label className="shrink-0 text-sm font-medium">Min. Bathrooms</Label>
        <Select
          value={goals.min_bathrooms?.toString() ?? ""}
          onValueChange={(v) =>
            setGoals((prev) => ({ ...prev, min_bathrooms: Number(v) }))
          }
        >
          <SelectTrigger className="w-full min-w-0 sm:w-auto sm:flex-1">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            {BATHROOM_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preferred Floor & Elevator — inline */}
      {isFloorRelevant && (
        <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <Label className="shrink-0 text-sm font-medium">Floor</Label>
          <Select
            value={goals.preferred_floor}
            onValueChange={(v) =>
              setGoals((prev) => ({ ...prev, preferred_floor: v }))
            }
          >
            <SelectTrigger className="w-full min-w-0 sm:w-auto sm:flex-1">
              <SelectValue placeholder="Any floor" />
            </SelectTrigger>
            <SelectContent>
              {FLOOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label
            htmlFor="elevator-required"
            className="flex shrink-0 cursor-pointer items-center gap-2"
          >
            <Checkbox
              id="elevator-required"
              checked={goals.has_elevator_required}
              onCheckedChange={(checked) =>
                setGoals((prev) => ({
                  ...prev,
                  has_elevator_required: checked === true,
                }))
              }
            />
            <span className="text-sm font-medium">Elevator</span>
          </label>
        </div>
      )}

      {/* Must-Have Features */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Must-Have Features</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {PROPERTY_FEATURES.map((feature) => (
            <FeatureCheckbox
              key={feature.value}
              feature={feature}
              checked={(goals.features || []).includes(feature.value)}
              onChange={(checked) =>
                handleFeatureToggle(feature.value, checked)
              }
            />
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-sm font-medium">
          Additional Notes
          <span className="ml-1 font-normal text-muted-foreground">
            (optional)
          </span>
        </Label>
        <Textarea
          id="notes"
          placeholder="Any specific requirements or preferences..."
          value={goals.additional_notes || ""}
          onChange={(e) =>
            setGoals((prev) => ({
              ...prev,
              additional_notes: e.target.value,
            }))
          }
          className="min-h-[80px]"
        />
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isPending || !hasMinimumSelection}
        className="w-full"
      >
        {isPending
          ? "Saving..."
          : goals.is_completed
            ? "Update Goals"
            : "Save & Continue"}
      </Button>

      {goals.is_completed && (
        <p className="text-center text-sm text-green-600">
          Your property goals have been saved. You can update them anytime.
        </p>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyGoalsForm }
