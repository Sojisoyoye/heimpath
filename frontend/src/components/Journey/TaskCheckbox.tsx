/**
 * Task Checkbox Component
 * Individual task item with completion toggle
 */

import { cn } from "@/common/utils"
import { Checkbox } from "@/components/ui/checkbox"
import type { JourneyTask } from "@/models/journey"

interface IProps {
  task: JourneyTask
  onToggle: (taskId: string, isCompleted: boolean) => void
  disabled?: boolean
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Task item with checkbox. */
function TaskCheckbox(props: IProps) {
  const { task, onToggle, disabled = false, className } = props

  const handleChange = (checked: boolean) => {
    onToggle(task.id, checked)
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        task.is_completed && "bg-muted/50",
        !disabled && "hover:bg-muted/30",
        className
      )}
    >
      <Checkbox
        id={`task-${task.id}`}
        checked={task.is_completed}
        onCheckedChange={handleChange}
        disabled={disabled}
        className="mt-0.5"
      />
      <label
        htmlFor={`task-${task.id}`}
        className={cn(
          "flex-1 cursor-pointer text-sm leading-relaxed",
          task.is_completed && "text-muted-foreground line-through",
          disabled && "cursor-not-allowed"
        )}
      >
        {task.title}
      </label>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { TaskCheckbox }
