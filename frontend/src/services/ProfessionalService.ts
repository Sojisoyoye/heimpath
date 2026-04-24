/**
 * Professional Service
 * Handles all API calls related to the professional directory
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
  ContactInquiry,
  ContactInquiryCreate,
  Professional,
  ProfessionalDetail,
  ProfessionalFilter,
  ProfessionalFilterOptions,
  ProfessionalReview,
  ServiceType,
} from "@/models/professional"
import { PATHS } from "./common/Paths"
import { transformKeys } from "./common/transformKeys"

interface ProfessionalListResponse {
  data: Professional[]
  total: number
  page: number
  pageSize: number
  count: number
}

/******************************************************************************
                              Service
******************************************************************************/

class ProfessionalServiceClass {
  /**
   * Get available filter options (cities and languages) from the directory
   */
  async getFilterOptions(): Promise<ProfessionalFilterOptions> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.PROFESSIONALS.LIST.replace(/\/$/, "")}/filters`,
    })
    return transformKeys<ProfessionalFilterOptions>(response)
  }

  /**
   * Get paginated list of professionals with optional filters
   */
  async getProfessionals(
    filters?: ProfessionalFilter,
  ): Promise<{ data: Professional[]; total: number }> {
    const params = new URLSearchParams()
    if (filters?.type) params.append("type", filters.type)
    if (filters?.city) params.append("city", filters.city)
    if (filters?.language) params.append("language", filters.language)
    if (filters?.minRating != null)
      params.append("min_rating", String(filters.minRating))
    if (filters?.sortBy) params.append("sort_by", filters.sortBy)
    params.append("page", String(filters?.page ?? 1))
    params.append("page_size", String(filters?.pageSize ?? 20))

    const url = `${PATHS.PROFESSIONALS.LIST}?${params.toString()}`
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url,
    })
    const transformed = transformKeys<ProfessionalListResponse>(response)
    return { data: transformed.data, total: transformed.total }
  }

  /**
   * Get professional detail with reviews
   */
  async getProfessional(id: string): Promise<ProfessionalDetail> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.PROFESSIONALS.DETAIL(id),
    })
    return transformKeys<ProfessionalDetail>(response)
  }

  /**
   * Submit a review for a professional
   */
  async submitReview(
    professionalId: string,
    data: {
      rating: number
      comment?: string
      serviceUsed?: ServiceType
      languageUsed?: string
      wouldRecommend?: boolean
      responseTimeRating?: number
    },
  ): Promise<ProfessionalReview> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.PROFESSIONALS.REVIEWS(professionalId),
      body: {
        rating: data.rating,
        comment: data.comment ?? null,
        service_used: data.serviceUsed ?? null,
        language_used: data.languageUsed ?? null,
        would_recommend: data.wouldRecommend ?? null,
        response_time_rating: data.responseTimeRating ?? null,
      },
      mediaType: "application/json",
    })
    return transformKeys<ProfessionalReview>(response)
  }

  /**
   * Submit a contact inquiry to a professional
   */
  async submitInquiry(
    professionalId: string,
    data: ContactInquiryCreate,
  ): Promise<ContactInquiry> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.PROFESSIONALS.INQUIRIES(professionalId),
      body: {
        sender_name: data.senderName,
        sender_email: data.senderEmail,
        message: data.message,
      },
      mediaType: "application/json",
    })
    return transformKeys<ContactInquiry>(response)
  }

  /**
   * Track a referral click for a professional
   */
  async trackClick(professionalId: string): Promise<void> {
    await request(OpenAPI, {
      method: "POST",
      url: PATHS.PROFESSIONALS.CLICK(professionalId),
    })
  }
}

export const ProfessionalService = new ProfessionalServiceClass()
