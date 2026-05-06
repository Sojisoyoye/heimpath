/**
 * Clause Card Component
 * Expandable card showing original German text alongside the English explanation
 */

import { AlertTriangle, ChevronDown, ChevronRight, Tag } from "lucide-react"
import { useState } from "react"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { ClauseExplanation } from "@/models/contract"

interface IProps {
  clause: ClauseExplanation
  index: number
}

/******************************************************************************
                              Constants
******************************************************************************/

const RISK_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

const RISK_LABELS: Record<string, string> = {
  high: "High Risk",
  medium: "Medium Risk",
  low: "Low Risk",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Single expandable clause card. */
function ClauseCard(props: Readonly<IProps>) {
  const { clause, index } = props
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4">
        <button
          type="button"
          className="w-full text-left cursor-pointer select-none"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              {expanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="text-sm font-medium truncate">
                {index + 1}. {clause.sectionNameEn}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                ({clause.sectionName})
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {clause.isUnusual && (
                <Badge
                  variant="outline"
                  className="text-xs border-orange-400 text-orange-600 dark:text-orange-400"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Unusual
                </Badge>
              )}
              <Badge className={cn("text-xs", RISK_STYLES[clause.riskLevel])}>
                {RISK_LABELS[clause.riskLevel]}
              </Badge>
            </div>
          </div>
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Original German */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Original (German)
              </p>
              <div className="bg-muted/40 rounded-md p-3 text-sm text-muted-foreground leading-relaxed">
                {clause.originalText}
              </div>
            </div>

            {/* English explanation */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Plain English
              </p>
              <div className="bg-muted/40 rounded-md p-3 text-sm leading-relaxed">
                {clause.plainEnglishExplanation}
              </div>
            </div>
          </div>

          {/* Risk reason */}
          <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{clause.riskReason}</span>
          </div>

          {/* Unusual terms */}
          {clause.unusualTerms.length > 0 && (
            <div className="mt-2 flex items-start gap-2 text-xs">
              <Tag className="h-3.5 w-3.5 shrink-0 mt-0.5 text-orange-500" />
              <div className="flex flex-wrap gap-1">
                {clause.unusualTerms.map((term) => (
                  <Badge
                    key={term}
                    variant="outline"
                    className="text-xs border-orange-300"
                  >
                    {term}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ClauseCard }
