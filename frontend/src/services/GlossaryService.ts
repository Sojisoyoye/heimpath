/**
 * Glossary Service
 * Handles all API calls related to the German real estate glossary
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
  GlossaryCategoryInfo,
  GlossaryFilter,
  GlossaryListResponse,
  GlossarySearchResponse,
  GlossaryTermCreate,
  GlossaryTermDetail,
  GlossaryTermSummary,
  GlossaryTermUpdate,
} from "@/models/glossary"
import { PATHS } from "./common/Paths"
import { transformKeys, transformKeysToSnake } from "./common/transformKeys"

interface RawListResponse {
  data: GlossaryTermSummary[]
  total: number
  page: number
  pageSize: number
}

interface RawCategoriesResponse {
  categories: GlossaryCategoryInfo[]
}

/******************************************************************************
                              Service
******************************************************************************/

class GlossaryServiceClass {
  /**
   * Get paginated list of glossary terms with optional filters
   */
  async getTerms(filters?: GlossaryFilter): Promise<GlossaryListResponse> {
    const params = new URLSearchParams()
    if (filters?.category) params.append("category", filters.category)
    params.append("page", String(filters?.page ?? 1))
    params.append("page_size", String(filters?.pageSize ?? 20))

    const url = `${PATHS.GLOSSARY.LIST}?${params.toString()}`
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url,
    })
    return transformKeys<RawListResponse>(response)
  }

  /**
   * Get a specific glossary term by slug
   */
  async getTerm(slug: string): Promise<GlossaryTermDetail> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.GLOSSARY.DETAIL(slug),
    })
    return transformKeys<GlossaryTermDetail>(response)
  }

  /**
   * Search glossary terms by query
   */
  async searchTerms(
    query: string,
    limit = 20,
  ): Promise<GlossarySearchResponse> {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
    })
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.GLOSSARY.SEARCH}?${params.toString()}`,
    })
    return transformKeys<GlossarySearchResponse>(response)
  }

  /**
   * Get glossary categories with term counts
   */
  async getCategories(): Promise<GlossaryCategoryInfo[]> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.GLOSSARY.CATEGORIES,
    })
    const transformed = transformKeys<RawCategoriesResponse>(response)
    return transformed.categories
  }

  // ── Admin (superuser only) ────────────────────────────────────────────────

  async createTerm(data: GlossaryTermCreate): Promise<GlossaryTermDetail> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.GLOSSARY.CREATE,
      body: transformKeysToSnake(data),
      mediaType: "application/json",
    })
    return transformKeys<GlossaryTermDetail>(response)
  }

  async updateTerm(
    slug: string,
    data: GlossaryTermUpdate,
  ): Promise<GlossaryTermDetail> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "PUT",
      url: PATHS.GLOSSARY.UPDATE(slug),
      body: transformKeysToSnake(data),
      mediaType: "application/json",
    })
    return transformKeys<GlossaryTermDetail>(response)
  }

  async deleteTerm(slug: string): Promise<void> {
    await request(OpenAPI, {
      method: "DELETE",
      url: PATHS.GLOSSARY.DELETE(slug),
    })
  }
}

export const GlossaryService = new GlossaryServiceClass()
