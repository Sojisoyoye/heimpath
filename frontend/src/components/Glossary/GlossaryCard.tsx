/**
 * Glossary Card Component
 * Displays a glossary term summary in a card format
 */

import { Link } from "@tanstack/react-router"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { GlossaryCategory, GlossaryTermSummary } from "@/models/glossary"

interface IProps {
  term: GlossaryTermSummary
  showCategory?: boolean
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  buying_process: "Buying Process",
  costs_taxes: "Costs & Taxes",
  financing: "Financing",
  legal: "Legal",
  rental: "Rental",
  property_types: "Property Types",
}

const CATEGORY_COLORS: Record<GlossaryCategory, string> = {
  buying_process:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  costs_taxes:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  financing:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  legal:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  rental:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  property_types:
    "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Glossary term summary card. */
function GlossaryCard(props: Readonly<IProps>) {
  const { term, showCategory = true, className } = props

  return (
    <Card className={cn("transition-shadow hover:shadow-md group", className)}>
      <CardHeader className="pb-2">
        <div className="space-y-2">
          {showCategory && (
            <Badge
              variant="outline"
              className={cn("text-xs", CATEGORY_COLORS[term.category])}
            >
              {CATEGORY_LABELS[term.category]}
            </Badge>
          )}
          <Link
            to="/glossary/$slug"
            params={{ slug: term.slug }}
            className="block"
          >
            <CardTitle className="text-base font-semibold group-hover:text-blue-600 transition-colors">
              {term.termDe}
            </CardTitle>
          </Link>
          <p className="text-sm text-muted-foreground">{term.termEn}</p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {term.definitionShort}
        </p>
        <Link
          to="/glossary/$slug"
          params={{ slug: term.slug }}
          className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Learn more →
        </Link>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { GlossaryCard, CATEGORY_COLORS, CATEGORY_LABELS }
