/**
 * Article Detail Page
 * Displays full article with TOC, rating, and related content
 */

import { createFileRoute } from "@tanstack/react-router"

import { ArticleDetail } from "@/components/Articles"
import { useArticle } from "@/hooks/queries"
import type { ArticleDetail as ArticleDetailType } from "@/models/article"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/articles/$slug")({
  component: ArticleDetailPage,
  head: () => ({
    meta: [{ title: "Article - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Article detail page. */
function ArticleDetailPage() {
  const { slug } = Route.useParams()

  const { data: article, isLoading, error } = useArticle(slug)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load article
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The article could not be found or there was an error loading it.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || !article) {
    return <ArticleDetail article={{} as ArticleDetailType} isLoading />
  }

  return <ArticleDetail article={article} />
}

/******************************************************************************
                              Export
******************************************************************************/

export default ArticleDetailPage
