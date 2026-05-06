/**
 * FieldTooltip
 * Info icon with tooltip that works on both desktop (hover) and mobile (tap)
 */

import { Info } from "lucide-react"
import { useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface IProps {
  text: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Info icon that shows a tooltip on hover (desktop) or tap (mobile). */
function FieldTooltip(props: IProps) {
  const { text } = props
  const [open, setOpen] = useState(false)

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        type="button"
        className="inline-flex align-middle ml-1"
        onClick={(e) => {
          e.preventDefault()
          setOpen((prev) => !prev)
        }}
      >
        <Info className="h-3.5 w-3.5 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4} className="max-w-64">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FieldTooltip }
