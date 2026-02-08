/**
 * Progress Bar Component
 * Displays journey completion progress
 */

import { cn } from "@/common/utils"

interface IProps {
  value: number
  max?: number
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const SIZE_CLASSES = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
} as const

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Progress bar with percentage. */
function ProgressBar(props: IProps) {
  const { value, max = 100, showLabel = false, size = "md", className } = props
  const percentage = Math.min(Math.round((value / max) * 100), 100)

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{percentage}%</span>
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-secondary",
          SIZE_CLASSES[size]
        )}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full bg-blue-600 transition-all duration-300",
            percentage === 100 && "bg-green-600"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ProgressBar }
