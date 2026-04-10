/**
 * Search Service
 * Handles global search API calls
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type { GlobalSearchResponse } from "@/models/search"
import { PATHS } from "./common/Paths"
import { transformKeys } from "./common/transformKeys"

/******************************************************************************
                              Service
******************************************************************************/

class SearchServiceClass {
  /**
   * Global search across laws and articles
   */
  async globalSearch(query: string, limit = 10): Promise<GlobalSearchResponse> {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
    })
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.SEARCH.GLOBAL}?${params.toString()}`,
    })
    return transformKeys<GlobalSearchResponse>(response)
  }
}

export const SearchService = new SearchServiceClass()
