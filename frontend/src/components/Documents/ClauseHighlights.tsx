/**
 * Clause Highlights Component
 * Detected clauses grouped by type with risk level badges, coloured
 * left-border indicators, expandable risk explanations, and a summary banner.
 */

import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

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

const RISK_BADGE_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

const RISK_BORDER_STYLES: Record<string, string> = {
  high: "border-l-4 border-l-red-500",
  medium: "border-l-4 border-l-yellow-500",
  low: "border-l-4 border-l-green-500",
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

/** Build a stable key for a clause item within its type group. */
function clauseKey(clause: DetectedClause, index: number): string {
  return `${clause.clauseType}-${clause.pageNumber}-${index}`
}

/******************************************************************************
                              Components
******************************************************************************/

interface IRiskSummaryProps {
  clauses: DetectedClause[]
}

/** Banner summarising high and medium risk clause counts. */
function RiskSummaryBanner(props: Readonly<IRiskSummaryProps>) {
  const { clauses } = props
  const highCount = clauses.filter((c) => c.riskLevel === "high").length
  const mediumCount = clauses.filter((c) => c.riskLevel === "medium").length

  if (highCount === 0 && mediumCount === 0) return null

  return (
    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
      <p className="text-sm text-red-800 dark:text-red-300">
        {highCount > 0 && (
          <span className="font-semibold">
            {highCount} high-risk clause{highCount === 1 ? "" : "s"} found
            {" — "}review before signing
          </span>
        )}
        {highCount > 0 && mediumCount > 0 && (
          <span className="text-red-600 dark:text-red-400"> · </span>
        )}
        {mediumCount > 0 && (
          <span>
            {mediumCount} clause{mediumCount === 1 ? "" : "s"} need attention
          </span>
        )}
      </p>
    </div>
  )
}

interface IClauseItemProps {
  clause: DetectedClause
  itemKey: string
}

/** Single clause card with coloured left border and expandable risk reason. */
function ClauseItem(props: Readonly<IClauseItemProps>) {
  const { clause } = props
  const [expanded, setExpanded] = useState(false)
  const hasReason = clause.riskReason.trim().length > 0
  const borderStyle =
    RISK_BORDER_STYLES[clause.riskLevel] ?? RISK_BORDER_STYLES.low

  return (
    <div className={cn("rounded-md border p-3 space-y-2", borderStyle)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Page {clause.pageNumber}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant="outline"
            className={cn("text-xs", RISK_BADGE_STYLES[clause.riskLevel])}
          >
            {clause.riskLevel} risk
          </Badge>
          {hasReason && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-expanded={expanded}
              aria-label={expanded ? "Hide explanation" : "Show explanation"}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Original</p>
          <p className="text-sm">{clause.originalText}</p>
        </div>
        {clause.translatedText && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Translation</p>
            <p className="text-sm">{clause.translatedText}</p>
          </div>
        )}
      </div>
      {expanded && hasReason && (
        <div className="rounded bg-muted/50 px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            Why this risk level?
          </p>
          <p className="text-xs">{clause.riskReason}</p>
        </div>
      )}
    </div>
  )
}

/** Default component. Grouped clause highlights with risk summary. */
function ClauseHighlights(props: Readonly<IProps>) {
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
      <RiskSummaryBanner clauses={clauses} />
      {Object.entries(grouped).map(([type, items]) => (
        <Card key={type}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {CLAUSE_TYPE_LABELS[type] ?? type}
              <Badge variant="outline" className="ml-2 text-xs">
                {items.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((clause, i) => (
              <ClauseItem
                key={clauseKey(clause, i)}
                clause={clause}
                itemKey={clauseKey(clause, i)}
              />
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
