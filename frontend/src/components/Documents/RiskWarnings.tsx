/**
 * Risk Warnings Component
 * Legal term warnings grouped by risk level
 */

import { AlertCircle, AlertTriangle, Info } from "lucide-react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DocumentRiskWarning } from "@/models/document"

interface IProps {
  warnings: DocumentRiskWarning[]
}

/******************************************************************************
                              Constants
******************************************************************************/

const RISK_ORDER = ["high", "medium", "low"]

const RISK_CONFIG: Record<
  string,
  {
    icon: typeof AlertTriangle
    label: string
    className: string
    cardClassName: string
  }
> = {
  high: {
    icon: AlertTriangle,
    label: "High Risk",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    cardClassName: "border-red-200 dark:border-red-900",
  },
  medium: {
    icon: AlertCircle,
    label: "Medium Risk",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    cardClassName: "border-yellow-200 dark:border-yellow-900",
  },
  low: {
    icon: Info,
    label: "Low Risk",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    cardClassName: "border-green-200 dark:border-green-900",
  },
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Group warnings by risk level, sorted high first. */
function groupByRisk(
  warnings: DocumentRiskWarning[],
): [string, DocumentRiskWarning[]][] {
  const groups: Record<string, DocumentRiskWarning[]> = {}
  for (const w of warnings) {
    const level = w.riskLevel
    if (!groups[level]) groups[level] = []
    groups[level].push(w)
  }

  return RISK_ORDER.filter((level) => groups[level]).map((level) => [
    level,
    groups[level],
  ])
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Risk warnings grouped by severity. */
function RiskWarnings(props: IProps) {
  const { warnings } = props

  if (!warnings.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        No risk warnings detected
      </div>
    )
  }

  const grouped = groupByRisk(warnings)

  return (
    <div className="space-y-4">
      {grouped.map(([level, items]) => {
        const config = RISK_CONFIG[level] || RISK_CONFIG.low
        const Icon = config.icon

        return (
          <Card key={level} className={cn(config.cardClassName)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {config.label}
                <Badge
                  variant="outline"
                  className={cn("text-xs", config.className)}
                >
                  {items.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((warning, i) => (
                <div key={i} className="border rounded-md p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {warning.originalTerm}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      &rarr;
                    </span>
                    <span className="text-sm">{warning.translatedTerm}</span>
                    {warning.pageNumber && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        Page {warning.pageNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {warning.explanation}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RiskWarnings }
