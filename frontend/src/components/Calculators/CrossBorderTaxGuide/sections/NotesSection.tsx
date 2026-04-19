/**
 * Country-Specific Notes Section
 * Amber warning box with country-specific tax considerations
 */

import { AlertTriangle } from "lucide-react"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  notes: string[]
}

/******************************************************************************
                              Components
******************************************************************************/

function NotesSection(props: Readonly<IProps>) {
  const { notes } = props

  return (
    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4" />
        <h4 className="font-semibold text-sm">Country-Specific Notes</h4>
      </div>
      <ul className="list-disc pl-5 space-y-1 text-sm text-amber-800 dark:text-amber-300">
        {notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { NotesSection }
