/**
 * Clause Highlights Component
 * Detected clauses grouped by type with risk level badges
 */

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DetectedClause } from "@/models/document"

interface IProps {
  clauses: DetectedClause[]
}

/******************************************************************************
                              Constants
******************************************************************************/

const CLAUSE_TYPE_LABELS: Record<string, string> = {
  purchase_price: "Purchase Price",
  deadline: "Deadline",
  warranty_exclusion: "Warranty Exclusion",
  special_condition: "Special Condition",
  financial_term: "Financial Term",
}

const RISK_LEVEL_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Group clauses by their clause type. */
function groupByType(
  clauses: DetectedClause[],
): Record<string, DetectedClause[]> {
  const groups: Record<string, DetectedClause[]> = {}
  for (const clause of clauses) {
    const key = clause.clauseType
    if (!groups[key]) groups[key] = []
    groups[key].push(clause)
  }
  return groups
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Grouped clause highlights. */
function ClauseHighlights(props: IProps) {
  const { clauses } = props

  if (!clauses.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        No legal clauses detected
      </div>
    )
  }

  const grouped = groupByType(clauses)

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, items]) => (
        <Card key={type}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {CLAUSE_TYPE_LABELS[type] || type}
              <Badge variant="outline" className="ml-2 text-xs">
                {items.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((clause, i) => (
              <div key={i} className="border rounded-md p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Page {clause.pageNumber}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      RISK_LEVEL_STYLES[clause.riskLevel],
                    )}
                  >
                    {clause.riskLevel} risk
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Original
                    </p>
                    <p className="text-sm">{clause.originalText}</p>
                  </div>
                  {clause.translatedText && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Translation
                      </p>
                      <p className="text-sm">{clause.translatedText}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ClauseHighlights }
