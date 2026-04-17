/**
 * Star Rating Component
 * Reusable star display/input for 1-5 ratings
 */

import { Star } from "lucide-react"
import { useState } from "react"
import { cn } from "@/common/utils"

interface IProps {
  rating: number
  maxStars?: number
  interactive?: boolean
  size?: "sm" | "md"
  onRate?: (rating: number) => void
}

/******************************************************************************
                              Constants
******************************************************************************/

const SIZE_CLASSES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Displays or accepts star ratings. */
function StarRating(props: Readonly<IProps>) {
  const {
    rating,
    maxStars = 5,
    interactive = false,
    size = "sm",
    onRate,
  } = props
  const [hoverRating, setHoverRating] = useState(0)

  const displayRating = hoverRating || rating

  const ariaProps = interactive
    ? {}
    : {
        role: "img" as const,
        "aria-label": `${rating} out of ${maxStars} stars`,
      }

  return (
    <div className="flex items-center gap-0.5" {...ariaProps}>
      {Array.from({ length: maxStars }, (_, i) => {
        const starValue = i + 1
        const isFilled = starValue <= displayRating
        const starIcon = (
          <Star
            className={cn(
              SIZE_CLASSES[size],
              isFilled
                ? "fill-yellow-400 text-yellow-400"
                : "fill-none text-gray-300 dark:text-gray-600",
            )}
          />
        )

        if (!interactive) {
          return (
            <span key={starValue} aria-hidden="true">
              {starIcon}
            </span>
          )
        }

        return (
          <button
            key={starValue}
            type="button"
            aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
            className="cursor-pointer hover:scale-110 transition-colors"
            onClick={() => onRate?.(starValue)}
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(0)}
          >
            {starIcon}
          </button>
        )
      })}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StarRating }
