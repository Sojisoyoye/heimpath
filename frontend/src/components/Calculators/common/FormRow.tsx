/**
 * FormRow
 * Horizontal label-input layout that stacks vertically on mobile
 */

import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { FieldTooltip } from "./FieldTooltip"

interface IProps {
  htmlFor?: string
  label: string
  tooltip?: string
  required?: boolean
  optional?: boolean
  error?: string
  children: ReactNode
}

/******************************************************************************
                              Components
******************************************************************************/

/** Horizontal label-input row. Stacks on mobile, inline on sm+. */
function FormRow(props: IProps) {
  const { htmlFor, label, tooltip, required, optional, error, children } = props
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
      <Label htmlFor={htmlFor} className="leading-tight sm:w-48 sm:shrink-0">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {optional && (
          <span className="ml-1 font-normal text-muted-foreground">
            (optional)
          </span>
        )}
        {tooltip && <FieldTooltip text={tooltip} />}
      </Label>
      <div className="min-w-0 sm:flex-1">
        {children}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FormRow }
