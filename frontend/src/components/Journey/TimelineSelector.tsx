/**
 * Timeline Selector Component
 * Allows user to set target date for their property purchase
 */

import { Calendar, Info } from "lucide-react"

import { cn } from "@/common/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface IProps {
  value?: string
  onChange: (value: string | undefined) => void
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const TIMELINE_PRESETS = [
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
  { label: "2 years", months: 24 },
] as const

/******************************************************************************
                              Functions
******************************************************************************/

/** Get date string for X months from now. */
function getDateInMonths(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return date.toISOString().split("T")[0]
}

/** Format date for display. */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

/** Get minimum date (today). */
function getMinDate(): string {
  return new Date().toISOString().split("T")[0]
}

/******************************************************************************
                              Components
******************************************************************************/

/** Timeline preset button. */
function PresetButton(props: {
  label: string
  isSelected: boolean
  onClick: () => void
}) {
  const { label, isSelected, onClick } = props

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-all",
        isSelected
          ? "bg-blue-600 text-white"
          : "bg-muted hover:bg-muted/80 text-foreground"
      )}
    >
      {label}
    </button>
  )
}

/** Default component. Timeline selector with presets and date picker. */
function TimelineSelector(props: IProps) {
  const { value, onChange, className } = props

  const handlePresetClick = (months: number) => {
    onChange(getDateInMonths(months))
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value || undefined)
  }

  const handleClear = () => {
    onChange(undefined)
  }

  // Check which preset matches the current value
  const getSelectedPreset = (): number | null => {
    if (!value) return null
    for (const preset of TIMELINE_PRESETS) {
      const presetDate = getDateInMonths(preset.months)
      // Allow 7 days tolerance for matching
      const diff = Math.abs(
        new Date(value).getTime() - new Date(presetDate).getTime()
      )
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return preset.months
      }
    }
    return null
  }

  const selectedPreset = getSelectedPreset()

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h3 className="text-lg font-semibold">When do you want to buy?</h3>
        <p className="text-sm text-muted-foreground">
          Set a target date for your property purchase (optional)
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm text-muted-foreground mb-3 block">
            Quick select
          </Label>
          <div className="flex flex-wrap gap-2">
            {TIMELINE_PRESETS.map((preset) => (
              <PresetButton
                key={preset.months}
                label={preset.label}
                isSelected={selectedPreset === preset.months}
                onClick={() => handlePresetClick(preset.months)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetDate">Or select a specific date</Label>
          <div className="relative max-w-xs">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="targetDate"
              type="date"
              min={getMinDate()}
              value={value || ""}
              onChange={handleDateChange}
              className="pl-9"
            />
          </div>
        </div>

        {value && (
          <div className="flex items-center gap-4">
            <p className="text-sm">
              Target date:{" "}
              <span className="font-medium">{formatDate(value)}</span>
            </p>
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <Info className="h-5 w-5 shrink-0 text-blue-600" />
        <div className="text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100">
            Typical timeline
          </p>
          <p className="text-blue-800 dark:text-blue-200">
            The property buying process in Germany typically takes 3-6 months
            from the start of your search to closing. Financing approval can add
            4-8 weeks.
          </p>
        </div>
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { TimelineSelector }
