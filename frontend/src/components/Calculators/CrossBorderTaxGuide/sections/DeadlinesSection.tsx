/**
 * Key Deadlines Section
 * List of important tax filing deadlines
 */

import { Calendar } from "lucide-react"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  deadlines: string[]
}

/******************************************************************************
                              Components
******************************************************************************/

function DeadlinesSection(props: Readonly<IProps>) {
  const { deadlines } = props

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-semibold text-sm">Key Deadlines</h4>
      </div>
      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
        {deadlines.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { DeadlinesSection }
