/**
 * Glossary List Page
 * Browse and search German real estate terminology
 */

import { createFileRoute } from "@tanstack/react-router"
import { Languages, Search } from "lucide-react"
import { useState } from "react"
import { GlossaryList, GlossarySearch } from "@/components/Glossary"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/glossary/")({
  component: GlossaryPage,
  head: () => ({
    meta: [{ title: "German RE Glossary - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Glossary listing page. */
function GlossaryPage() {
  const [activeTab, setActiveTab] = useState<string>("browse")

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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
          <GlossarySearch />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default GlossaryPage
