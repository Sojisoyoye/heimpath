/**
 * Article Service
 * Handles all API calls related to the content library
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
  ArticleCategoryInfo,
  ArticleDetail,
  ArticleFilter,
  ArticleRating,
  ArticleSearchResult,
  ArticleSummary,
} from "@/models/article"
import { PATHS } from "./common/Paths"

interface ArticleListResponse {
  data: ArticleSummary[]
  total: number
  page: number
  pageSize: number
  count: number
}

interface ArticleSearchResponse {
  data: ArticleSearchResult[]
  count: number
  query: string
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Convert a snake_case string to camelCase. */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

/** Recursively convert all object keys from snake_case to camelCase. */
function transformKeys<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item)) as T
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        snakeToCamel(key),
        transformKeys(value),
      ]),
    ) as T
  }
  return obj as T
}

/******************************************************************************
                              Service
******************************************************************************/

class ArticleServiceClass {
  /**
   * Get paginated list of published articles
   */
  async getArticles(
    filters?: ArticleFilter,
  ): Promise<{ data: ArticleSummary[]; total: number }> {
    const params = new URLSearchParams()
    if (filters?.category) params.append("category", filters.category)
    if (filters?.difficultyLevel)
      params.append("difficulty_level", filters.difficultyLevel)
    params.append("page", String(filters?.page ?? 1))
    params.append("page_size", String(filters?.pageSize ?? 20))

    const url = `${PATHS.ARTICLES.LIST}?${params.toString()}`
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url,
    })
    const transformed = transformKeys<ArticleListResponse>(response)
    return { data: transformed.data, total: transformed.total }
  }

  /**
   * Get article detail by slug
   */
  async getArticle(slug: string): Promise<ArticleDetail> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.ARTICLES.DETAIL(slug),
    })
    return transformKeys<ArticleDetail>(response)
  }

  /**
   * Search articles
   */
  async searchArticles(
    query: string,
    limit = 20,
  ): Promise<ArticleSearchResponse> {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
    })
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.ARTICLES.SEARCH}?${params.toString()}`,
    })
    return transformKeys<ArticleSearchResponse>(response)
  }

  /**
   * Get article categories with counts
   */
  async getCategories(): Promise<ArticleCategoryInfo[]> {
    const response = await request<unknown[]>(OpenAPI, {
      method: "GET",
      url: PATHS.ARTICLES.CATEGORIES,
    })
    return transformKeys<ArticleCategoryInfo[]>(response)
  }

  /**
   * Rate an article as helpful or not
   */
  async rateArticle(slug: string, isHelpful: boolean): Promise<ArticleRating> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.ARTICLES.RATE(slug),
      body: { is_helpful: isHelpful },
      mediaType: "application/json",
    })
    return transformKeys<ArticleRating>(response)
  }
}

export const ArticleService = new ArticleServiceClass()
