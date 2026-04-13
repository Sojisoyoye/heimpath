/**
 * View Mode Toggle Component
 * Switches between list and tab view for journey steps
 */

import { LayoutGrid, List } from "lucide-react"

import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"

type ViewMode = "list" | "tab"

interface IProps {
  viewMode: ViewMode
  onChange: (mode: ViewMode) => void
}

/******************************************************************************
                              Components
******************************************************************************/

function ViewModeToggle(props: IProps) {
  const { viewMode, onChange } = props

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={viewMode === "list" ? "default" : "ghost"}
        size="icon-sm"
        aria-label="List view"
        onClick={() => onChange("list")}
        className={cn(viewMode === "list" && "pointer-events-none")}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "tab" ? "default" : "ghost"}
        size="icon-sm"
        aria-label="Tab view"
        onClick={() => onChange("tab")}
        className={cn(viewMode === "tab" && "pointer-events-none")}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ViewModeToggle }
export type { ViewMode }
