/**
 * Legal Service
 * Handles all API calls related to the legal knowledge base
 *
 * Note: This service wraps API calls for the legal knowledge base. Run `npm run generate-client`
 * after adding new law endpoints to regenerate the typed client.
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
  BookmarkResponse,
  LawCategory,
  LawDetail,
  LawFilter,
  LawSearchResult,
  LawSummary,
} from "@/models/legal"
import { PATHS } from "./common/Paths"
import { transformKeys } from "./common/transformKeys"

interface LawListResponse {
  data: LawSummary[]
  total: number
  page: number
  pageSize: number
  count: number
}

interface BookmarkListResponse {
  data: BookmarkResponse[]
  count: number
}

interface CategoriesResponse {
  categories: LawCategory[]
}

/******************************************************************************
                              Service
******************************************************************************/

class LegalServiceClass {
  /**
   * Get paginated list of laws with optional filters
   */
  async getLaws(
    filters?: LawFilter,
  ): Promise<{ data: LawSummary[]; total: number }> {
    const params = new URLSearchParams()
    if (filters?.category) params.append("category", filters.category)
    if (filters?.propertyType)
      params.append("property_type", filters.propertyType)
    if (filters?.state) params.append("state", filters.state)
    params.append("page", String(filters?.page ?? 1))
    params.append("page_size", String(filters?.pageSize ?? 20))

    const url = `${PATHS.LAWS.LIST}?${params.toString()}`
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url,
    })
    const transformed = transformKeys<LawListResponse>(response)
    return { data: transformed.data, total: transformed.total }
  }

  /**
   * Get a specific law by ID
   */
  async getLaw(lawId: string): Promise<LawDetail> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.LAWS.DETAIL(lawId),
    })
    return transformKeys<LawDetail>(response)
  }

  /**
   * Search laws by query
   */
  async searchLaws(
    query: string,
    page = 1,
    pageSize = 20,
  ): Promise<LawSearchResult> {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      page_size: String(pageSize),
    })
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.LAWS.SEARCH}?${params.toString()}`,
    })
    const transformed = transformKeys<{
      data: LawSummary[]
      count: number
      query: string
    }>(response)
    return {
      query: transformed.query,
      results: transformed.data,
      total: transformed.count,
      page,
      pageSize,
    }
  }

  /**
   * Get law categories
   */
  async getCategories(): Promise<CategoriesResponse> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.LAWS.CATEGORIES,
    })
    return transformKeys<CategoriesResponse>(response)
  }

  /**
   * Bookmark a law
   */
  async createBookmark(
    lawId: string,
    notes?: string,
  ): Promise<BookmarkResponse> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.LAWS.BOOKMARK(lawId),
      body: { notes },
      mediaType: "application/json",
    })
    return transformKeys<BookmarkResponse>(response)
  }

  /**
   * Remove a bookmark
   */
  async deleteBookmark(lawId: string): Promise<void> {
    await request<{ message: string }>(OpenAPI, {
      method: "DELETE",
      url: PATHS.LAWS.BOOKMARK(lawId),
    })
  }

  /**
   * Get user's bookmarked laws
   */
  async getBookmarks(): Promise<BookmarkListResponse> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.LAWS.BOOKMARKS,
    })
    return transformKeys<BookmarkListResponse>(response)
  }

  /**
   * Get laws relevant to a journey step
   */
  async getLawsByJourneyStep(stepKey: string): Promise<{ data: LawSummary[] }> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.LAWS.BY_JOURNEY_STEP(stepKey),
    })
    return transformKeys<{ data: LawSummary[] }>(response)
  }
}

export const LegalService = new LegalServiceClass()
