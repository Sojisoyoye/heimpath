/**
 * Professional Detail Component
 * Full profile view with reviews and review form
 */

import { Link } from "@tanstack/react-router"
import { ArrowLeft, BadgeCheck, Globe, Mail, MapPin, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { ProfessionalDetail as ProfessionalDetailType } from "@/models/professional"
import { PROFESSIONAL_TYPE_LABELS } from "@/models/professional"
import { ReviewForm } from "./ReviewForm"
import { StarRating } from "./StarRating"

interface IProps {
  professional: ProfessionalDetailType | null
  isLoading?: boolean
}

/******************************************************************************
                              Components
******************************************************************************/

/** Review item display. */
function ReviewItem(
  props: Readonly<{
    rating: number
    comment?: string
    createdAt: string
  }>,
) {
  const { rating, comment, createdAt } = props

  return (
    <div className="space-y-2 py-4">
      <div className="flex items-center gap-3">
        <StarRating rating={rating} />
        <span className="text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </div>
      {comment && <p className="text-sm text-muted-foreground">{comment}</p>}
    </div>
  )
}

/** Default component. Professional full profile view. */
function ProfessionalDetail(props: Readonly<IProps>) {
  const { professional, isLoading } = props

  if (isLoading || !professional) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/professionals">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to directory
        </Button>
      </Link>

      {/* Profile header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{professional.name}</h1>
          {professional.isVerified && (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              <BadgeCheck className="h-3.5 w-3.5 mr-1" />
              Verified
            </Badge>
          )}
        </div>
        <Badge variant="outline">
          {PROFESSIONAL_TYPE_LABELS[professional.type]}
        </Badge>
        <div className="flex items-center gap-2">
          <StarRating
            rating={Math.round(professional.averageRating)}
            size="md"
          />
          <span className="text-sm text-muted-foreground">
            {professional.averageRating.toFixed(1)} ({professional.reviewCount}{" "}
            {professional.reviewCount === 1 ? "review" : "reviews"})
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {professional.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {professional.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Reviews ({professional.reviewCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {professional.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No reviews yet. Be the first to leave a review!
                </p>
              ) : (
                <div className="divide-y">
                  {professional.reviews.map((review) => (
                    <ReviewItem
                      key={review.id}
                      rating={review.rating}
                      comment={review.comment}
                      createdAt={review.createdAt}
                    />
                  ))}
                </div>
              )}
              <Separator className="my-4" />
              <ReviewForm professionalId={professional.id} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Contact info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{professional.city}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{professional.languages}</span>
              </div>
              {professional.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${professional.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {professional.email}
                  </a>
                </div>
              )}
              {professional.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`tel:${professional.phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {professional.phone}
                  </a>
                </div>
              )}
              {professional.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={professional.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                  >
                    {professional.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ProfessionalDetail }
