/**
 * Article List Component
 * Paginated listing of articles with filters
 */

import { BookOpen, Loader2 } from "lucide-react"
import { useState } from "react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useArticleCategories, useArticles } from "@/hooks/queries"
import type {
  ArticleCategory,
  ArticleFilter,
  DifficultyLevel,
} from "@/models/article"
import { ArticleCard, CATEGORY_LABELS, DIFFICULTY_LABELS } from "./ArticleCard"

interface IProps {
  initialCategory?: ArticleCategory
  showCategoryFilter?: boolean
  pageSize?: number
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

/** Loading skeleton for article list. */
function ArticleListSkeleton(props: { count?: number }) {
  const { count = 6 } = props

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  )
}

/** Empty state when no articles found. */
function EmptyState(props: { category?: ArticleCategory }) {
  const { category } = props

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No articles found</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {category
          ? "No articles found in this category. Try selecting a different category."
          : "No articles available. Check back later for updates."}
      </p>
    </div>
  )
}

/** Category filter bar. */
function CategoryFilterBar(props: {
  selected?: ArticleCategory
  onChange: (category: ArticleCategory | undefined) => void
}) {
  const { selected, onChange } = props
  const { data: categories } = useArticleCategories()

  const allCategories: ArticleCategory[] = [
    "buying_process",
    "costs_and_taxes",
    "regulations",
    "common_pitfalls",
  ]

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={!selected ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(undefined)}
      >
        All
      </Button>
      {allCategories.map((cat) => {
        const count = categories?.find((c) => c.key === cat)?.articleCount
        return (
          <Button
            key={cat}
            variant={selected === cat ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(cat)}
            className="gap-1"
          >
            {CATEGORY_LABELS[cat]}
            {count !== undefined && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {count}
              </Badge>
            )}
          </Button>
        )
      })}
    </div>
  )
}

/** Difficulty filter bar. */
function DifficultyFilterBar(props: {
  selected?: DifficultyLevel
  onChange: (level: DifficultyLevel | undefined) => void
}) {
  const { selected, onChange } = props
  const levels: DifficultyLevel[] = ["beginner", "intermediate", "advanced"]

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={!selected ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(undefined)}
      >
        All Levels
      </Button>
      {levels.map((level) => (
        <Button
          key={level}
          variant={selected === level ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(level)}
        >
          {DIFFICULTY_LABELS[level]}
        </Button>
      ))}
    </div>
  )
}

/** Default component. Paginated article list with filters. */
function ArticleList(props: IProps) {
  const {
    initialCategory,
    showCategoryFilter = true,
    pageSize = 12,
    className,
  } = props

  const [filter, setFilter] = useState<ArticleFilter>({
    category: initialCategory,
    page: 1,
    pageSize,
  })

  const { data, isLoading, error, isFetching } = useArticles(filter)

  const handleCategoryChange = (category: ArticleCategory | undefined) => {
    setFilter((prev) => ({ ...prev, category, page: 1 }))
  }

  const handleDifficultyChange = (
    difficultyLevel: DifficultyLevel | undefined,
  ) => {
    setFilter((prev) => ({ ...prev, difficultyLevel, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilter((prev) => ({ ...prev, page }))
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return (
    <div className={cn("space-y-6", className)}>
      {showCategoryFilter && (
        <div className="space-y-3">
          <CategoryFilterBar
            selected={filter.category}
            onChange={handleCategoryChange}
          />
          <DifficultyFilterBar
            selected={filter.difficultyLevel}
            onChange={handleDifficultyChange}
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">
            Failed to load articles. Please try again.
          </p>
        </div>
      )}

      {isLoading && <ArticleListSkeleton count={pageSize} />}

      {!isLoading &&
        !error &&
        data &&
        (data.data.length === 0 ? (
          <EmptyState category={filter.category} />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {data.data.length} of {data.total} articles
                {isFetching && (
                  <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                )}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  showCategory={!filter.category}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filter.page! - 1)}
                  disabled={filter.page === 1 || isFetching}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {filter.page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filter.page! + 1)}
                  disabled={filter.page === totalPages || isFetching}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ))}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ArticleList }
