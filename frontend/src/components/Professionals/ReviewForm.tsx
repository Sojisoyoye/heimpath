/**
 * Review Form Component
 * Submit a review for a professional (auth-gated)
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSubmitReview } from "@/hooks/mutations"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import type { ServiceType } from "@/models/professional"
import { SERVICE_TYPE_LABELS } from "@/models/professional"
import { StarRating } from "./StarRating"

interface IProps {
  professionalId: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Review submission form. */
function ReviewForm(props: Readonly<IProps>) {
  const { professionalId } = props
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [serviceUsed, setServiceUsed] = useState<ServiceType | undefined>()
  const [languageUsed, setLanguageUsed] = useState("")
  const [wouldRecommend, setWouldRecommend] = useState<boolean | undefined>()
  const [responseTimeRating, setResponseTimeRating] = useState(0)

  const submitReview = useSubmitReview(professionalId)

  if (!user) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Please log in to leave a review.
        </p>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) return

    submitReview.mutate(
      {
        rating,
        comment: comment.trim() || undefined,
        serviceUsed,
        languageUsed: languageUsed.trim() || undefined,
        wouldRecommend,
        responseTimeRating: responseTimeRating || undefined,
      },
      {
        onSuccess: () => {
          showSuccessToast("Your review has been submitted.")
          setRating(0)
          setComment("")
          setServiceUsed(undefined)
          setLanguageUsed("")
          setWouldRecommend(undefined)
          setResponseTimeRating(0)
        },
        onError: () => {
          showErrorToast(
            "Could not submit your review. You may have already reviewed this professional.",
          )
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Write a Review</h3>
      <div className="space-y-2">
        <span className="text-sm font-medium">Rating</span>
        <StarRating rating={rating} interactive size="md" onRate={setRating} />
      </div>
      <div className="space-y-2">
        <label htmlFor="review-comment" className="text-sm font-medium">
          Comment (optional)
        </label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          maxLength={2000}
          rows={4}
        />
      </div>
      {/* Structured review prompts */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="service-used" className="text-sm font-medium">
            Service used (optional)
          </label>
          <Select
            value={serviceUsed ?? "none"}
            onValueChange={(v) =>
              setServiceUsed(v === "none" ? undefined : (v as ServiceType))
            }
          >
            <SelectTrigger id="service-used">
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select service</SelectItem>
              {(
                Object.entries(SERVICE_TYPE_LABELS) as [ServiceType, string][]
              ).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="language-used" className="text-sm font-medium">
            Language used (optional)
          </label>
          <Input
            id="language-used"
            value={languageUsed}
            onChange={(e) => setLanguageUsed(e.target.value)}
            placeholder="e.g. English, German"
            maxLength={100}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="text-sm font-medium">
            Would you recommend? (optional)
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={wouldRecommend === true ? "default" : "outline"}
              onClick={() =>
                setWouldRecommend(wouldRecommend === true ? undefined : true)
              }
            >
              Yes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={wouldRecommend === false ? "destructive" : "outline"}
              onClick={() =>
                setWouldRecommend(wouldRecommend === false ? undefined : false)
              }
            >
              No
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">Response time (optional)</span>
          <StarRating
            rating={responseTimeRating}
            interactive
            size="md"
            onRate={setResponseTimeRating}
          />
        </div>
      </div>
      <Button type="submit" disabled={rating === 0 || submitReview.isPending}>
        {submitReview.isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ReviewForm }
