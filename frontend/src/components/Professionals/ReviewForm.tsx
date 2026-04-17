/**
 * Review Form Component
 * Submit a review for a professional (auth-gated)
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useSubmitReview } from "@/hooks/mutations"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
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
      { rating, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          showSuccessToast("Your review has been submitted.")
          setRating(0)
          setComment("")
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
