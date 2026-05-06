/**
 * Article Query Hooks
 * React Query hooks for content library data fetching
 */

import { useQuery } from "@tanstack/react-query"
import type { ArticleFilter } from "@/models/article"
import { queryKeys } from "@/query/queryKeys"
import { ArticleService } from "@/services/ArticleService"

/**
 * Get paginated list of published articles
 */
export function useArticles(filters?: ArticleFilter) {
  return useQuery({
    queryKey: queryKeys.articles.list(
      filters as Record<string, unknown> | undefined,
    ),
    queryFn: () => ArticleService.getArticles(filters),
  })
}

/**
 * Get article detail by slug
 */
export function useArticle(slug: string) {
  return useQuery({
    queryKey: queryKeys.articles.detail(slug),
    queryFn: () => ArticleService.getArticle(slug),
    enabled: !!slug,
  })
}

/**
 * Search articles by query
 */
export function useArticleSearch(query: string, limit = 20) {
  return useQuery({
    queryKey: queryKeys.articles.search(query),
    queryFn: () => ArticleService.searchArticles(query, limit),
    enabled: query.length >= 2,
  })
}

/**
 * Get article categories with counts
 */
export function useArticleCategories() {
  return useQuery({
    queryKey: queryKeys.articles.categories(),
    queryFn: () => ArticleService.getCategories(),
    staleTime: 30 * 60 * 1000,
  })
}
