/**
 * Article Search Component
 * Search interface for content library articles
 */

import { ContentSearch } from "@/components/Common/ContentSearch"
import { useArticleSearch } from "@/hooks/queries"
import { ArticleCard } from "./ArticleCard"

interface IProps {
  onQueryChange?: (query: string) => void
  initialQuery?: string
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Article search with results grid. */
function ArticleSearch(props: Readonly<IProps>) {
  return (
    <ContentSearch
      {...props}
      placeholder="Search articles..."
      entityLabel="article"
      useSearchHook={useArticleSearch}
      getCount={(data) => data.count}
      renderResults={(data) => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    />
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ArticleSearch }
