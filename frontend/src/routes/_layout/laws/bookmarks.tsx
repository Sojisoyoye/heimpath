/**
 * Bookmarks Page
 * Displays user's bookmarked laws
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BookmarksList } from "@/components/Legal"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/laws/bookmarks")({
  component: BookmarksPage,
  head: () => ({
    meta: [{ title: "My Bookmarks - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Bookmarks page. */
function BookmarksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/laws">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">My Bookmarks</h1>
          <p className="text-muted-foreground">
            Laws you've saved for quick reference
          </p>
        </div>
      </div>

      <BookmarksList />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default BookmarksPage
