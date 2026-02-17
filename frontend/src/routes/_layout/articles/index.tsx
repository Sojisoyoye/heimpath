/**
 * Articles List Page
 * Browse and search the content library
 */

import { createFileRoute } from "@tanstack/react-router"
import { BookOpen, Search } from "lucide-react"
import { useState } from "react"
import { ArticleList, ArticleSearch } from "@/components/Articles"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/articles/")({
  component: ArticlesPage,
  head: () => ({
    meta: [{ title: "Content Library - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Articles listing page. */
function ArticlesPage() {
  const [activeTab, setActiveTab] = useState<string>("browse")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Content Library
        </h1>
        <p className="text-muted-foreground">
          In-depth guides to buying property in Germany
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-6">
          <ArticleList showCategoryFilter pageSize={12} />
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <ArticleSearch />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default ArticlesPage
