/**
 * Professional Card Component
 * Displays a professional summary in a card format
 */

import { Link } from "@tanstack/react-router"
import { BadgeCheck, Globe, Mail, MapPin, Phone, ThumbsUp } from "lucide-react"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Professional, ProfessionalType } from "@/models/professional"
import { PROFESSIONAL_TYPE_LABELS } from "@/models/professional"
import { StarRating } from "./StarRating"

interface IProps {
  professional: Professional
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const TYPE_COLORS: Record<ProfessionalType, string> = {
  lawyer: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  notary:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  tax_advisor:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  mortgage_broker:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  real_estate_agent:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Professional summary card. */
function ProfessionalCard(props: Readonly<IProps>) {
  const { professional, className } = props

  return (
    <Card className={cn("transition-shadow hover:shadow-md group", className)}>
      <CardHeader className="pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("text-xs", TYPE_COLORS[professional.type])}
            >
              {PROFESSIONAL_TYPE_LABELS[professional.type]}
            </Badge>
            {professional.isVerified && (
              <Badge
                variant="outline"
                className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                <BadgeCheck className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          <Link
            to="/professionals/$professionalId"
            params={{ professionalId: professional.id }}
            className="block"
          >
            <CardTitle className="text-base font-semibold group-hover:text-blue-600 transition-colors">
              {professional.name}
            </CardTitle>
          </Link>
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(professional.averageRating)} />
            <span className="text-xs text-muted-foreground">
              {professional.averageRating.toFixed(1)} (
              {professional.reviewCount}{" "}
              {professional.reviewCount === 1 ? "review" : "reviews"})
            </span>
          </div>
          {professional.recommendationRate != null &&
            professional.recommendationRate > 80 &&
            professional.reviewCount >= 3 && (
              <Badge
                variant="outline"
                className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Recommended by {Math.round(professional.recommendationRate)}%
              </Badge>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {professional.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            {professional.languages}
          </span>
          {professional.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {professional.email}
            </span>
          )}
          {professional.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {professional.phone}
            </span>
          )}
        </div>
        {professional.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {professional.description}
          </p>
        )}
        <Link
          to="/professionals/$professionalId"
          params={{ professionalId: professional.id }}
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View profile →
        </Link>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ProfessionalCard }
