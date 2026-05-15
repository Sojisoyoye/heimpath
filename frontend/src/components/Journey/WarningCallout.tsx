/**
 * Warning Callout Component
 * Renders journey tasks categorised as "warning" — amber callout blocks
 * that surface important caveats or risks. Not interactive (no checkbox).
 */

import { AlertTriangle } from "lucide-react"

import { cn } from "@/common/utils"
import type { JourneyTask } from "@/models/journey"

interface IProps {
  tasks: JourneyTask[]
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Amber callout block listing warning tasks for a step. */
function WarningCallout(props: Readonly<IProps>) {
  const { tasks, className } = props

  if (tasks.length === 0) return null

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Important
        </span>
      </div>
      <ul className="space-y-1.5">
        {tasks.map((task) => (
          <li key={task.id}>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {task.title}
            </p>
            {task.description && (
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                {task.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { WarningCallout }
