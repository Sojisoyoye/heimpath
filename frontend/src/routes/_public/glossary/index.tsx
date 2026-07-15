/**
 * Glossary List Page
 * Browse and search German real estate terminology
 */

import { createFileRoute } from "@tanstack/react-router"
import { Languages, Search } from "lucide-react"
import { seoMeta } from "@/common/seo"
import { validateSearchTabQuery } from "@/common/utils"
import { GlossaryList, GlossarySearch } from "@/components/Glossary"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTabQueryNavigation } from "@/hooks"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_public/glossary/")({
  component: GlossaryPage,
  validateSearch: validateSearchTabQuery,
  head: () =>
    seoMeta({
      title: "German Real Estate Glossary - HeimPath",
      description:
        "Key German real estate terms every foreign property buyer should know — translated and explained in plain English.",
      path: "/glossary",
    }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Glossary listing page. */
function GlossaryPage() {
  const { tab, q } = Route.useSearch()
  const { activeTab, handleTabChange, handleQueryChange } =
    useTabQueryNavigation("/glossary", { tab, q })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Languages className="h-6 w-6" />
          German Real Estate Glossary
        </h1>
        <p className="text-muted-foreground">
          Key German terms every property buyer should know
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="browse" className="gap-2">
            <Languages className="h-4 w-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-6">
          <GlossaryList showCategoryFilter pageSize={21} />
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          <GlossarySearch initialQuery={q} onQueryChange={handleQueryChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default GlossaryPage
