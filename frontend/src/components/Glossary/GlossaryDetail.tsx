/**
 * Glossary Detail Component
 * Full glossary term view with definition, example, and related terms
 */

import { Link } from "@tanstack/react-router"
import { ArrowLeft, BookOpen, Quote } from "lucide-react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { GlossaryTermDetail as GlossaryTermDetailType } from "@/models/glossary"
import { CATEGORY_COLORS, CATEGORY_LABELS, GlossaryCard } from "./GlossaryCard"

interface IProps {
  term: GlossaryTermDetailType
  isLoading?: boolean
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Loading skeleton for glossary detail. */
function GlossaryDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

/** Example usage card. */
function ExampleUsage(props: { text: string }) {
  const { text } = props

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Quote className="h-4 w-4 text-blue-600" />
          Example Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm italic">{text}</p>
      </CardContent>
    </Card>
  )
}

/** Default component. Full glossary term detail view. */
function GlossaryDetail(props: IProps) {
  const { term, isLoading, className } = props

  if (isLoading) {
    return <GlossaryDetailSkeleton />
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link to="/glossary">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Glossary
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-3">
        <Badge
          variant="outline"
          className={cn("text-xs", CATEGORY_COLORS[term.category])}
        >
          {CATEGORY_LABELS[term.category]}
        </Badge>

        <h1 className="text-3xl font-bold">{term.termDe}</h1>
        <p className="text-lg text-muted-foreground">{term.termEn}</p>
      </div>

      <Separator />

      {/* Short definition */}
      <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
        <BookOpen className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
        <p className="text-sm font-medium">{term.definitionShort}</p>
      </div>

      {/* Full definition */}
      <div className="prose prose-slate dark:prose-invert max-w-none">
        {term.definitionLong.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {/* Example usage */}
      {term.exampleUsage && <ExampleUsage text={term.exampleUsage} />}

      {/* Related terms */}
      {term.relatedTerms.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Related Terms</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {term.relatedTerms.map((related) => (
                <GlossaryCard key={related.id} term={related} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { GlossaryDetail }
