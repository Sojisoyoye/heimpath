/**
 * Law Card Component
 * Displays a law summary in a card format
 */

import { Link } from "@tanstack/react-router"
import { Building, Home, MapPin, Scale, Store } from "lucide-react"
import { LAW_CATEGORIES } from "@/common/constants"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LawSummary, PropertyTypeApplicability } from "@/models/legal"
import { BookmarkButton } from "./BookmarkButton"

interface IProps {
  law: LawSummary
  showCategory?: boolean
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const PROPERTY_TYPE_ICONS: Record<PropertyTypeApplicability, typeof Scale> = {
  all: Scale,
  apartment: Building,
  house: Home,
  commercial: Store,
  land: MapPin,
}

const PROPERTY_TYPE_LABELS: Record<PropertyTypeApplicability, string> = {
  all: "All Properties",
  apartment: "Apartments",
  house: "Houses",
  commercial: "Commercial",
  land: "Land",
}

const CATEGORY_COLORS: Record<string, string> = {
  buying_process:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  costs_and_taxes:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rental_law:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  condominium:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  agent_regulations:
    "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Law summary card. */
function LawCard(props: IProps) {
  const { law, showCategory = true, className } = props

  const categoryLabel =
    LAW_CATEGORIES.find((c) => c.key === law.category)?.label || law.category
  const PropertyIcon = PROPERTY_TYPE_ICONS[law.propertyType]

  return (
    <Card className={cn("transition-shadow hover:shadow-md group", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {showCategory && (
                <Badge
                  variant="outline"
                  className={cn("text-xs", CATEGORY_COLORS[law.category])}
                >
                  {categoryLabel}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs gap-1">
                <PropertyIcon className="h-3 w-3" />
                {PROPERTY_TYPE_LABELS[law.propertyType]}
              </Badge>
            </div>
            <Link
              to="/laws/$lawId"
              params={{ lawId: law.id }}
              className="block"
            >
              <CardTitle className="text-base font-semibold group-hover:text-blue-600 transition-colors line-clamp-2">
                {law.titleEn}
              </CardTitle>
            </Link>
            <p className="text-xs text-muted-foreground font-mono">
              {law.citation}
            </p>
          </div>
          <BookmarkButton
            lawId={law.id}
            isBookmarked={law.isBookmarked ?? false}
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {law.oneLineSummary}
        </p>
        <Link
          to="/laws/$lawId"
          params={{ lawId: law.id }}
          className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Read more →
        </Link>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { LawCard }
