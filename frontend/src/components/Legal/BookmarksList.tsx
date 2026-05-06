/**
 * Bookmarks List Component
 * Displays user's bookmarked laws
 */

import { Link } from "@tanstack/react-router"
import { Bookmark, Loader2, Plus } from "lucide-react"

import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBookmarks } from "@/hooks/queries"
import { LawCard } from "./LawCard"

interface IProps {
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Loading skeleton for bookmarks. */
function BookmarksListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  )
}

/** Empty state when no bookmarks. */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Bookmark className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No bookmarks yet</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        Save laws you want to reference later by clicking the bookmark icon on
        any law.
      </p>
      <Button asChild className="mt-4">
        <Link to="/laws">
          <Plus className="mr-2 h-4 w-4" />
          Browse Laws
        </Link>
      </Button>
    </div>
  )
}

/** Default component. User's bookmarked laws list. */
function BookmarksList(props: IProps) {
  const { className } = props

  const { data, isLoading, error, isFetching } = useBookmarks()

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            My Bookmarks
          </h2>
          <p className="text-sm text-muted-foreground">
            Laws you've saved for quick reference
          </p>
        </div>
        {isFetching && !isLoading && (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">
            Failed to load bookmarks. Please try again.
          </p>
        </div>
      )}

      {isLoading && <BookmarksListSkeleton />}

      {!isLoading &&
        !error &&
        data &&
        (data.data.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {data.count} bookmarked law{data.count !== 1 ? "s" : ""}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((bookmark) => (
                <LawCard
                  key={bookmark.id}
                  law={{ ...bookmark.law, isBookmarked: true }}
                />
              ))}
            </div>
          </>
        ))}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { BookmarksList }
