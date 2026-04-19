/**
 * Clause Analysis Component
 * AI-analyzed Kaufvertrag clauses with risk ratings, explanations, and notary checklist
 */

import {
  AlertTriangle,
  Bot,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Square,
} from "lucide-react"
import { useCallback, useState } from "react"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  KaufvertragAnalysis,
  NotaryQuestion as NotaryQuestionModel,
} from "@/models/document"

interface IProps {
  analysis: KaufvertragAnalysis
}

/******************************************************************************
                              Constants
******************************************************************************/

const RISK_LEVEL_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

const PRIORITY_STYLES: Record<string, string> = {
  essential: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  recommended:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  optional: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
}

/******************************************************************************
                              Components
******************************************************************************/

interface INotaryChecklistProps {
  questions: NotaryQuestionModel[]
}

/** Notary checklist with interactive checkboxes. */
function NotaryChecklist(props: Readonly<INotaryChecklistProps>) {
  const { questions } = props
  const [checkedQuestions, setCheckedQuestions] = useState<Set<number>>(
    new Set(),
  )

  const toggleQuestion = useCallback((index: number) => {
    setCheckedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          What to Ask Your Notary
          <Badge variant="outline" className="ml-2 text-xs">
            {checkedQuestions.size}/{questions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {questions.map((item, i) => {
          const isChecked = checkedQuestions.has(i)
          return (
            <button
              key={i}
              type="button"
              className="flex items-start gap-3 w-full text-left p-2 rounded-md hover:bg-muted/50 transition-colors"
              onClick={() => toggleQuestion(i)}
            >
              {isChecked ? (
                <CheckSquare className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              ) : (
                <Square className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm",
                    isChecked && "line-through text-muted-foreground",
                  )}
                >
                  {item.question}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", PRIORITY_STYLES[item.priority])}
                  >
                    {item.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {item.relatedClause}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}

/** Default component. AI-analyzed Kaufvertrag clauses and notary checklist. */
function ClauseAnalysis(props: Readonly<IProps>) {
  const { analysis } = props
  const [expandedClauses, setExpandedClauses] = useState<Set<number>>(new Set())

  const toggleClause = useCallback((index: number) => {
    setExpandedClauses((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  return (
    <div className="space-y-6">
      {/* AI attribution + overall risk */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              AI-generated analysis — always verify with your notary
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Badge
              variant="outline"
              className={cn(
                "text-sm shrink-0",
                RISK_LEVEL_STYLES[analysis.overallRiskAssessment],
              )}
            >
              {analysis.overallRiskAssessment} risk
            </Badge>
            <p className="text-sm text-muted-foreground">
              {analysis.overallRiskExplanation}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contract summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Contract Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* Analyzed clauses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Analyzed Clauses
            <Badge variant="outline" className="ml-2 text-xs">
              {analysis.analyzedClauses.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analysis.analyzedClauses.map((clause, i) => {
            const isExpanded = expandedClauses.has(i)
            return (
              <div key={clause.sectionName} className="border rounded-md">
                <button
                  type="button"
                  className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => toggleClause(i)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {clause.sectionNameEn}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      ({clause.sectionName})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {clause.pageNumber && (
                      <span className="text-xs text-muted-foreground">
                        p.{clause.pageNumber}
                      </span>
                    )}
                    {clause.isUnusual && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        RISK_LEVEL_STYLES[clause.riskLevel],
                      )}
                    >
                      {clause.riskLevel}
                    </Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Original German
                      </p>
                      <p className="text-sm bg-muted/50 rounded p-2">
                        {clause.originalText}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Plain English Explanation
                      </p>
                      <p className="text-sm">
                        {clause.plainEnglishExplanation}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Risk Assessment
                      </p>
                      <p className="text-sm">{clause.riskReason}</p>
                    </div>
                    {clause.unusualTerms.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Unusual Terms
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {clause.unusualTerms.map((term) => (
                            <Badge
                              key={term}
                              variant="outline"
                              className="text-xs bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                            >
                              {term}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Notary checklist */}
      {analysis.notaryChecklist.length > 0 && (
        <NotaryChecklist questions={analysis.notaryChecklist} />
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ClauseAnalysis }
