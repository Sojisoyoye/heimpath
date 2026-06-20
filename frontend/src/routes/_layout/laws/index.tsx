/**
 * Laws List Page
 * Browse and search German property laws
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import { Bookmark, Scale, Search } from "lucide-react"
import { validateSearchTabQuery } from "@/common/utils"
import { LawList, LawSearch } from "@/components/Legal"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTabQueryNavigation } from "@/hooks"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/laws/")({
  component: LawsPage,
  validateSearch: validateSearchTabQuery,
  head: () => ({
    meta: [{ title: "Legal Knowledge Base - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Laws listing page. */
function LawsPage() {
  const { tab, q } = Route.useSearch()
  const { activeTab, handleTabChange, handleQueryChange } =
    useTabQueryNavigation("/laws", { tab, q })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Legal Knowledge Base
          </h1>
          <p className="text-muted-foreground">
            German property laws explained in plain English
          </p>
        </div>
        <Button variant="outline" asChild className="self-start shrink-0">
          <Link to="/laws/bookmarks">
            <Bookmark className="mr-2 h-4 w-4" />
            My Bookmarks
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="browse" className="gap-2">
            <Scale className="h-4 w-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-6">
          <LawList showCategoryFilter pageSize={12} />
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <LawSearch initialQuery={q} onQueryChange={handleQueryChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default LawsPage
