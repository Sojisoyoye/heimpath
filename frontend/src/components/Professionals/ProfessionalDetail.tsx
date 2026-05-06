/**
 * Professional Detail Component
 * Full profile view with reviews and review form
 */

import { Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  MousePointerClick,
  Phone,
  ThumbsUp,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useTrackClick } from "@/hooks/mutations"
import useAuth from "@/hooks/useAuth"
import type {
  ProfessionalDetail as ProfessionalDetailType,
  ProfessionalReview as ProfessionalReviewType,
  ServiceType,
} from "@/models/professional"
import {
  PROFESSIONAL_TYPE_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/models/professional"
import { ContactModal } from "./ContactModal"
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
function ReviewItem(props: Readonly<{ review: ProfessionalReviewType }>) {
  const { review } = props

  return (
    <div className="space-y-2 py-4">
      <div className="flex items-center gap-3 flex-wrap">
        <StarRating rating={review.rating} />
        <span className="text-xs text-muted-foreground">
          {new Date(review.createdAt).toLocaleDateString()}
        </span>
        {review.serviceUsed && (
          <Badge variant="outline" className="text-xs">
            {SERVICE_TYPE_LABELS[review.serviceUsed]}
          </Badge>
        )}
        {review.languageUsed && (
          <Badge variant="outline" className="text-xs">
            {review.languageUsed}
          </Badge>
        )}
        {review.wouldRecommend != null && (
          <span
            className={`flex items-center gap-1 text-xs ${review.wouldRecommend ? "text-amber-600" : "text-red-500"}`}
          >
            <ThumbsUp
              className={`h-3 w-3 ${review.wouldRecommend ? "" : "rotate-180"}`}
            />
            {review.wouldRecommend ? "Recommends" : "Does not recommend"}
          </span>
        )}
        {review.responseTimeRating != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Response: {review.responseTimeRating}/5
          </span>
        )}
      </div>
      {review.comment && (
        <p className="text-sm text-muted-foreground">{review.comment}</p>
      )}
    </div>
  )
}

/** Default component. Professional full profile view. */
function ProfessionalDetail(props: Readonly<IProps>) {
  const { professional, isLoading } = props
  const { user } = useAuth()
  const { mutate: trackClick } = useTrackClick()
  const [contactOpen, setContactOpen] = useState(false)

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
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
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

          {/* Trust signals */}
          {(professional.recommendationRate != null ||
            professional.reviewHighlights) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trust Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6">
                  {professional.recommendationRate != null && (
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium">
                          {Math.round(professional.recommendationRate)}%
                          recommended
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Based on {professional.reviewCount}{" "}
                          {professional.reviewCount === 1
                            ? "review"
                            : "reviews"}
                        </p>
                      </div>
                    </div>
                  )}
                  {professional.reviewHighlights?.avgResponseTime != null && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">
                          {professional.reviewHighlights.avgResponseTime.toFixed(
                            1,
                          )}
                          /5 response time
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Average rating
                        </p>
                      </div>
                    </div>
                  )}
                  {professional.reviewHighlights?.topServices &&
                    professional.reviewHighlights.topServices.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Top services</p>
                        <div className="flex gap-1.5">
                          {professional.reviewHighlights.topServices.map(
                            (svc) => (
                              <Badge
                                key={svc}
                                variant="outline"
                                className="text-xs"
                              >
                                {SERVICE_TYPE_LABELS[svc as ServiceType] ?? svc}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
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
                    <ReviewItem key={review.id} review={review} />
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

              <Separator />

              <Button
                className="w-full gap-2"
                onClick={() => {
                  trackClick(professional.id)
                  setContactOpen(true)
                }}
              >
                <MessageSquare className="h-4 w-4" />
                Contact Professional
              </Button>

              {user?.is_superuser && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <MousePointerClick className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {professional.clickCount} referral click
                    {professional.clickCount === 1 ? "" : "s"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ContactModal
        professionalId={professional.id}
        professionalName={professional.name}
        open={contactOpen}
        onClose={() => setContactOpen(false)}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ProfessionalDetail }
