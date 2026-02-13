/**
 * Property Goals Form Component
 * Interactive form for Step 1: Define Your Property Goals
 */

import { useState, useEffect } from "react";
import {
  Check,
  Home,
  Sun,
  Flower2,
  Car,
  Package,
  ChefHat,
  Leaf,
  Building2,
  Hammer,
  Volume2,
  Train,
  Accessibility,
  Dog,
} from "lucide-react";

import { cn } from "@/common/utils";
import {
  ROOM_OPTIONS,
  BATHROOM_OPTIONS,
  FLOOR_OPTIONS,
  PROPERTY_FEATURES,
  PROPERTY_TYPES,
} from "@/common/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdatePropertyGoals } from "@/hooks/mutations/useJourneyMutations";
import type { PropertyGoals } from "@/models/journey";

interface IProps {
  journeyId: string;
  initialGoals?: PropertyGoals;
  onComplete?: () => void;
  className?: string;
}

/******************************************************************************
                              Constants
******************************************************************************/

const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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
};

/******************************************************************************
                              Components
******************************************************************************/

/** Selection button for single choice options. */
function SelectionButton(props: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const { selected, onClick, children, className } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all",
        selected
          ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
          : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/50",
        className
      )}
    >
      {children}
    </button>
  );
}

/** Feature checkbox item. */
function FeatureCheckbox(props: {
  feature: { value: string; label: string };
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { feature, checked, onChange } = props;
  const Icon = FEATURE_ICONS[feature.value] || Home;

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all",
        checked
          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
          : "border-muted-foreground/20 hover:border-muted-foreground/40"
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        className="h-5 w-5"
      />
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{feature.label}</span>
    </label>
  );
}

/** Default component. Property goals form. */
function PropertyGoalsForm(props: IProps) {
  const { journeyId, initialGoals, onComplete, className } = props;

  const [goals, setGoals] = useState<PropertyGoals>({
    preferred_property_type: initialGoals?.preferred_property_type || "",
    min_rooms: initialGoals?.min_rooms || undefined,
    min_bathrooms: initialGoals?.min_bathrooms || undefined,
    preferred_floor: initialGoals?.preferred_floor || "",
    has_elevator_required: initialGoals?.has_elevator_required || false,
    features: initialGoals?.features || [],
    additional_notes: initialGoals?.additional_notes || "",
    is_completed: initialGoals?.is_completed || false,
  });

  const { mutate: updateGoals, isPending } = useUpdatePropertyGoals(journeyId);

  // Update local state when initialGoals changes
  useEffect(() => {
    if (initialGoals) {
      setGoals({
        preferred_property_type: initialGoals.preferred_property_type || "",
        min_rooms: initialGoals.min_rooms,
        min_bathrooms: initialGoals.min_bathrooms,
        preferred_floor: initialGoals.preferred_floor || "",
        has_elevator_required: initialGoals.has_elevator_required || false,
        features: initialGoals.features || [],
        additional_notes: initialGoals.additional_notes || "",
        is_completed: initialGoals.is_completed || false,
      });
    }
  }, [initialGoals]);

  const handleFeatureToggle = (feature: string, checked: boolean) => {
    setGoals((prev) => ({
      ...prev,
      features: checked
        ? [...(prev.features || []), feature]
        : (prev.features || []).filter((f) => f !== feature),
    }));
  };

  const handleSave = () => {
    updateGoals(
      { ...goals, is_completed: true },
      {
        onSuccess: () => {
          setGoals((prev) => ({ ...prev, is_completed: true }));
          onComplete?.();
        },
      }
    );
  };

  const hasMinimumSelection =
    goals.preferred_property_type || goals.min_rooms || (goals.features?.length ?? 0) > 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-blue-50 dark:bg-blue-950/30">
        <CardTitle className="flex items-center gap-2 text-base">
          <Home className="h-4 w-4" />
          Define Your Property Goals
          {goals.is_completed && (
            <Check className="ml-auto h-5 w-5 text-green-600" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Property Type */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Property Type</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PROPERTY_TYPES.map((type) => (
              <SelectionButton
                key={type.value}
                selected={goals.preferred_property_type === type.value}
                onClick={() =>
                  setGoals((prev) => ({
                    ...prev,
                    preferred_property_type: type.value,
                  }))
                }
              >
                {type.label.split(" ")[0]}
              </SelectionButton>
            ))}
          </div>
        </div>

        {/* Number of Rooms */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Minimum Rooms</Label>
          <div className="flex flex-wrap gap-2">
            {ROOM_OPTIONS.map((option) => (
              <SelectionButton
                key={option.value}
                selected={goals.min_rooms === option.value}
                onClick={() =>
                  setGoals((prev) => ({ ...prev, min_rooms: option.value }))
                }
                className="min-w-[80px]"
              >
                {option.label}
              </SelectionButton>
            ))}
          </div>
        </div>

        {/* Number of Bathrooms */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Minimum Bathrooms</Label>
          <div className="flex flex-wrap gap-2">
            {BATHROOM_OPTIONS.map((option) => (
              <SelectionButton
                key={option.value}
                selected={goals.min_bathrooms === option.value}
                onClick={() =>
                  setGoals((prev) => ({ ...prev, min_bathrooms: option.value }))
                }
                className="min-w-[100px]"
              >
                {option.label}
              </SelectionButton>
            ))}
          </div>
        </div>

        {/* Floor Preference */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Preferred Floor</Label>
          <div className="grid grid-cols-2 gap-2">
            {FLOOR_OPTIONS.map((option) => (
              <SelectionButton
                key={option.value}
                selected={goals.preferred_floor === option.value}
                onClick={() =>
                  setGoals((prev) => ({ ...prev, preferred_floor: option.value }))
                }
              >
                {option.label}
              </SelectionButton>
            ))}
          </div>
        </div>

        {/* Elevator Required */}
        <label className="flex cursor-pointer items-center gap-3">
          <Checkbox
            checked={goals.has_elevator_required}
            onCheckedChange={(checked) =>
              setGoals((prev) => ({
                ...prev,
                has_elevator_required: checked === true,
              }))
            }
          />
          <span className="text-sm font-medium">Elevator Required</span>
        </label>

        {/* Must-Have Features */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Must-Have Features</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PROPERTY_FEATURES.map((feature) => (
              <FeatureCheckbox
                key={feature.value}
                feature={feature}
                checked={(goals.features || []).includes(feature.value)}
                onChange={(checked) => handleFeatureToggle(feature.value, checked)}
              />
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            Additional Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Describe any specific requirements or preferences..."
            value={goals.additional_notes || ""}
            onChange={(e) =>
              setGoals((prev) => ({ ...prev, additional_notes: e.target.value }))
            }
            className="min-h-[100px]"
          />
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isPending || !hasMinimumSelection}
          className="w-full"
        >
          {isPending ? "Saving..." : goals.is_completed ? "Update Goals" : "Save & Continue"}
        </Button>

        {goals.is_completed && (
          <p className="text-center text-sm text-green-600">
            Your property goals have been saved. You can update them anytime.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyGoalsForm };
