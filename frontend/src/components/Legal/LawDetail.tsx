/**
 * Law Detail Component
 * Full law view with court rulings, state variations, and related laws
 */

import { Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  Scale,
  Gavel,
  MapPin,
  Link2,
  AlertTriangle,
  User,
  Users,
  Building,
  Home,
  FileText,
  Calendar,
} from "lucide-react"

import { cn } from "@/common/utils"
import { LAW_CATEGORIES, GERMAN_STATES } from "@/common/constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookmarkButton } from "./BookmarkButton"
import { LawCard } from "./LawCard"
import type { LawDetail as LawDetailType } from "@/models/legal"

interface IProps {
  law: LawDetailType
  isLoading?: boolean
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Loading skeleton for law detail. */
function LawDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

/** Court rulings section. */
function CourtRulingsSection(props: { rulings: LawDetailType["courtRulings"] }) {
  const { rulings } = props

  if (rulings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No court rulings recorded for this law.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {rulings.map((ruling) => (
        <Card key={ruling.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-muted-foreground" />
                  {ruling.court}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span className="font-mono">{ruling.caseNumber}</span>
                  <span>•</span>
                  <span>
                    {new Date(ruling.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{ruling.summary}</p>
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Implication
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {ruling.implication}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** State variations section. */
function StateVariationsSection(props: {
  variations: LawDetailType["stateVariations"]
}) {
  const { variations } = props

  if (variations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This law applies uniformly across all German states.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {variations.map((variation) => {
        const state = GERMAN_STATES.find((s) => s.code === variation.stateCode)

        return (
          <Card key={variation.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {state?.name || variation.stateName}
              </CardTitle>
              {variation.effectiveDate && (
                <CardDescription className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Effective:{" "}
                  {new Date(variation.effectiveDate).toLocaleDateString()}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm">{variation.variation}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/** Implications section for different parties. */
function ImplicationsSection(props: { law: LawDetailType }) {
  const { law } = props

  const implications = [
    { icon: User, label: "Buyers", text: law.buyerImplications },
    { icon: Users, label: "Sellers", text: law.sellerImplications },
    { icon: Building, label: "Landlords", text: law.landlordImplications },
    { icon: Home, label: "Tenants", text: law.tenantImplications },
  ].filter((item) => item.text)

  if (implications.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Who This Affects</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {implications.map(({ icon: Icon, label, text }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4 text-blue-600" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** Default component. Full law detail view. */
function LawDetail(props: IProps) {
  const { law, isLoading = false, className } = props

  if (isLoading) {
    return <LawDetailSkeleton />
  }

  const categoryLabel =
    LAW_CATEGORIES.find((c) => c.key === law.category)?.label || law.category

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/laws">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{law.titleEn}</h1>
              <p className="text-muted-foreground">{law.titleDe}</p>
            </div>
            <BookmarkButton
              lawId={law.id}
              isBookmarked={law.isBookmarked ?? false}
              variant="outline"
              size="default"
              showLabel
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">
              {law.citation}
            </Badge>
            <Badge variant="secondary">{categoryLabel}</Badge>
            {law.lastAmendedDate && (
              <span className="text-xs text-muted-foreground">
                Last amended:{" "}
                {new Date(law.lastAmendedDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-medium">{law.oneLineSummary}</p>
          <p className="text-muted-foreground">{law.shortSummary}</p>
        </CardContent>
      </Card>

      {/* Main content tabs */}
      <Tabs defaultValue="explanation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="explanation">Explanation</TabsTrigger>
          <TabsTrigger value="example">Real-World Example</TabsTrigger>
          <TabsTrigger value="rulings">
            Court Rulings ({law.courtRulings.length})
          </TabsTrigger>
          <TabsTrigger value="states">
            State Variations ({law.stateVariations.length})
          </TabsTrigger>
          {law.originalTextDe && (
            <TabsTrigger value="original">Original Text</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="explanation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detailed Explanation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{law.detailedExplanation}</p>
              </div>
            </CardContent>
          </Card>

          <ImplicationsSection law={law} />
        </TabsContent>

        <TabsContent value="example">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Real-World Example
              </CardTitle>
              <CardDescription>
                How this law applies in practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{law.realWorldExample}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rulings">
          <CourtRulingsSection rulings={law.courtRulings} />
        </TabsContent>

        <TabsContent value="states">
          <StateVariationsSection variations={law.stateVariations} />
        </TabsContent>

        {law.originalTextDe && (
          <TabsContent value="original">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Original German Text</CardTitle>
                <CardDescription>
                  Original law text in German (Originaltext)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-4 font-mono text-sm whitespace-pre-wrap">
                  {law.originalTextDe}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Separator />

      {/* Related laws */}
      {law.relatedLaws.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Related Laws
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {law.relatedLaws.map((relatedLaw) => (
              <LawCard key={relatedLaw.id} law={relatedLaw} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { LawDetail }
