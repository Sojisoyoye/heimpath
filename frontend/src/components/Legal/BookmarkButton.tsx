/**
 * Bookmark Button Component
 * Toggle bookmark for a law
 */

import { Bookmark, Loader2 } from "lucide-react"

import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { useToggleBookmark } from "@/hooks/mutations"

interface IProps {
  lawId: string
  isBookmarked: boolean
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg" | "icon"
  showLabel?: boolean
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Bookmark toggle button. */
function BookmarkButton(props: IProps) {
  const {
    lawId,
    isBookmarked,
    variant = "ghost",
    size = "icon",
    showLabel = false,
    className,
  } = props

  const { toggle, isPending } = useToggleBookmark()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggle(lawId, isBookmarked)
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        isBookmarked && "text-yellow-600 hover:text-yellow-700",
        className,
      )}
      title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
      )}
      {showLabel && (
        <span className="ml-2">{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
      )}
    </Button>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { BookmarkButton }
