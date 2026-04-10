/**
 * Search Results Page
 * Full search results with tabs for All / Laws / Articles
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import { FileText, Scale, Search } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useGlobalSearch } from "@/hooks/queries/useSearchQueries"
import type { SearchResultItem } from "@/models/search"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/search")({
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || "",
  }),
  head: () => ({
    meta: [{ title: "Search - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

function ResultCard({ item }: { item: SearchResultItem }) {
  const icon =
    item.resultType === "law" ? (
      <Scale className="h-5 w-5 shrink-0 text-muted-foreground" />
    ) : (
      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
    )

  const typeLabel = item.resultType === "law" ? "Law" : "Article"

  return (
    <Link
      to={item.urlPath}
      className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{item.title}</h3>
          <Badge variant="secondary" className="shrink-0">
            {typeLabel}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{item.snippet}</p>
      </div>
    </Link>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={`skeleton-${i}`}
          className="flex items-start gap-4 rounded-lg border p-4"
        >
          <Skeleton className="h-5 w-5 shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Search className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-medium">No results found</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        No results found for &quot;{query}&quot;. Try different keywords or
        check your spelling.
      </p>
    </div>
  )
}

function SearchPage() {
  const { q } = Route.useSearch()
  const [activeTab, setActiveTab] = useState("all")
  const { data, isLoading } = useGlobalSearch(q)

  const laws = data?.laws ?? []
  const articles = data?.articles ?? []
  const allResults = [...laws, ...articles]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Search Results</h1>
        {q && (
          <p className="mt-1 text-muted-foreground">
            {isLoading
              ? "Searching..."
              : `${data?.totalCount ?? 0} results for "${q}"`}
          </p>
        )}
      </div>

      {!q && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Enter a search query</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the search bar or Cmd+K to search across laws and articles.
          </p>
        </div>
      )}

      {q && isLoading && <LoadingSkeleton />}

      {q && !isLoading && data?.totalCount === 0 && <EmptyState query={q} />}

      {q && !isLoading && data && data.totalCount > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({allResults.length})</TabsTrigger>
            <TabsTrigger value="laws">Laws ({laws.length})</TabsTrigger>
            <TabsTrigger value="articles">
              Articles ({articles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="space-y-3">
              {allResults.map((item) => (
                <ResultCard key={`${item.resultType}-${item.id}`} item={item} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="laws" className="mt-4">
            {laws.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No matching laws found.
              </p>
            ) : (
              <div className="space-y-3">
                {laws.map((item) => (
                  <ResultCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="articles" className="mt-4">
            {articles.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No matching articles found.
              </p>
            ) : (
              <div className="space-y-3">
                {articles.map((item) => (
                  <ResultCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default SearchPage
