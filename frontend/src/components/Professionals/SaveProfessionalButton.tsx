/**
 * Save Professional Button Component
 * Heart icon toggle for saving/unsaving a professional
 */

import { Heart } from "lucide-react"
import { cn } from "@/common/utils"
import { useSaveProfessional, useUnsaveProfessional } from "@/hooks/mutations"

interface IProps {
  professionalId: string
  isSaved: boolean
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Heart toggle button for saving a professional. */
function SaveProfessionalButton({ professionalId, isSaved }: Readonly<IProps>) {
  const { mutate: save, isPending: isSaving } = useSaveProfessional()
  const { mutate: unsave, isPending: isUnsaving } = useUnsaveProfessional()

  const isPending = isSaving || isUnsaving

  function handleClick(e: React.MouseEvent) {
    // Prevent the parent <Link> from navigating
    e.preventDefault()
    e.stopPropagation()

    if (isPending) return

    if (isSaved) {
      unsave(professionalId)
    } else {
      save(professionalId)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={isSaved ? "Remove from saved" : "Save professional"}
      className={cn(
        "absolute top-3 right-3 z-10 rounded-full p-1.5 transition-colors",
        "bg-white/80 hover:bg-white dark:bg-gray-900/80 dark:hover:bg-gray-900",
        "shadow-sm",
        isPending && "opacity-50 cursor-not-allowed",
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          isSaved
            ? "fill-rose-500 text-rose-500"
            : "text-muted-foreground hover:text-rose-400",
        )}
      />
    </button>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { SaveProfessionalButton }
