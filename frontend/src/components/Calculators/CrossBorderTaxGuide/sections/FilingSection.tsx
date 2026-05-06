/**
 * Filing Requirements Section
 * List of German tax forms required for non-residents
 */

import { FileText } from "lucide-react"
import type { ICountryTaxData } from "../types"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  filings: ICountryTaxData["filings"]
}

/******************************************************************************
                              Components
******************************************************************************/

function FilingSection(props: Readonly<IProps>) {
  const { filings } = props

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-semibold text-sm">Filing Requirements</h4>
      </div>
      <div className="space-y-2">
        {filings.map((f) => (
          <div key={f.formName} className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">{f.formName}</p>
            <p className="text-muted-foreground text-xs">{f.description}</p>
            <p className="text-xs mt-1">
              <strong>Deadline:</strong> {f.deadline}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { FilingSection }
