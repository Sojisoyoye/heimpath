/**
 * Legal Service
 * Handles all API calls related to the legal knowledge base
 *
 * Note: This service wraps API calls for the legal knowledge base. Run `npm run generate-client`
 * after adding new law endpoints to regenerate the typed client.
 */

import { OpenAPI } from "@/client";
import { request } from "@/client/core/request";
import { PATHS } from "./common/Paths";
import type {
  LawSummary,
  LawDetail,
  LawSearchResult,
  LawCategory,
  BookmarkResponse,
  LawFilter,
} from "@/models/legal";

interface LawListResponse {
  data: LawSummary[];
  total: number;
  page: number;
  pageSize: number;
  count: number;
}

interface BookmarkListResponse {
  data: BookmarkResponse[];
  count: number;
}

interface CategoriesResponse {
  categories: LawCategory[];
}

class LegalServiceClass {
  /**
   * Get paginated list of laws with optional filters
   */
  async getLaws(filters?: LawFilter): Promise<{ data: LawSummary[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.category) params.append("category", filters.category);
    if (filters?.propertyType) params.append("property_type", filters.propertyType);
    if (filters?.state) params.append("state", filters.state);
    params.append("page", String(filters?.page ?? 1));
    params.append("page_size", String(filters?.pageSize ?? 20));

    const url = `${PATHS.LAWS.LIST}?${params.toString()}`;
    const response = await request<LawListResponse>(OpenAPI, {
      method: "GET",
      url,
    });
    return { data: response.data, total: response.total };
  }

  /**
   * Get a specific law by ID
   */
  async getLaw(lawId: string): Promise<LawDetail> {
    return request<LawDetail>(OpenAPI, {
      method: "GET",
      url: PATHS.LAWS.DETAIL(lawId),
    });
  }

  /**
   * Search laws by query
   */
  async searchLaws(query: string, page = 1, pageSize = 20): Promise<LawSearchResult> {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      page_size: String(pageSize),
    });
    return request<LawSearchResult>(OpenAPI, {
      method: "GET",
      url: `${PATHS.LAWS.SEARCH}?${params.toString()}`,
    });
  }

  /**
   * Get law categories
   */
  async getCategories(): Promise<CategoriesResponse> {
    return request<CategoriesResponse>(OpenAPI, {
      method: "GET",
      url: PATHS.LAWS.CATEGORIES,
    });
  }

  /**
   * Bookmark a law
   */
  async createBookmark(lawId: string, notes?: string): Promise<BookmarkResponse> {
    return request<BookmarkResponse>(OpenAPI, {
      method: "POST",
      url: PATHS.LAWS.BOOKMARK(lawId),
      body: { notes },
      mediaType: "application/json",
    });
  }

  /**
   * Remove a bookmark
   */
  async deleteBookmark(lawId: string): Promise<void> {
    await request<{ message: string }>(OpenAPI, {
      method: "DELETE",
      url: PATHS.LAWS.BOOKMARK(lawId),
    });
  }

  /**
   * Get user's bookmarked laws
   */
  async getBookmarks(): Promise<BookmarkListResponse> {
    return request<BookmarkListResponse>(OpenAPI, {
      method: "GET",
      url: PATHS.LAWS.BOOKMARKS,
    });
  }

  /**
   * Get laws relevant to a journey step
   */
  async getLawsByJourneyStep(stepKey: string): Promise<{ data: LawSummary[] }> {
    return request<{ data: LawSummary[]; step_content_key: string }>(OpenAPI, {
      method: "GET",
      url: PATHS.LAWS.BY_JOURNEY_STEP(stepKey),
    });
  }
}

export const LegalService = new LegalServiceClass();
