/**
 * MetricCard
 * Shared metric display card used across calculator components
 */

import { cn } from "@/common/utils"

interface IProps {
  label: string
  value: string
  description?: string
  variant?: "default" | "success" | "warning" | "danger"
}

/******************************************************************************
                              Components
******************************************************************************/

/** Metric display card with optional colour variant. */
function MetricCard(props: Readonly<IProps>) {
  const { label, value, description, variant = "default" } = props

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        variant === "success" &&
          "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30",
        variant === "warning" &&
          "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
        variant === "danger" &&
          "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold",
          variant === "success" && "text-green-600",
          variant === "warning" && "text-amber-600",
          variant === "danger" && "text-red-600",
        )}
      >
        {value}
      </p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MetricCard }
