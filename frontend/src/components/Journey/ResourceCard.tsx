/**
 * Resource Card Component
 * Renders a journey task categorised as "resource" — a clickable external link,
 * not a checkbox. Resources are informational and do not count toward step completion.
 */

import { ExternalLink } from "lucide-react"

import { cn } from "@/common/utils"
import type { JourneyTask } from "@/models/journey"

interface IProps {
  task: JourneyTask
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. External resource link card. */
function ResourceCard(props: Readonly<IProps>) {
  const { task, className } = props

  return (
    <a
      href={task.resource_url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-background p-3 text-sm transition-colors hover:bg-muted/30",
        className,
      )}
    >
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <span className="font-medium">{task.title}</span>
        {task.description && (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {task.description}
          </span>
        )}
      </div>
    </a>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ResourceCard }
