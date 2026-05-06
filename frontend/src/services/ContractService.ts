/**
 * Contract Service
 * Handles all API calls related to the contract explainer feature
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
  ContractAnalysis,
  ContractAnalysisListResponse,
} from "@/models/contract"
import { PATHS } from "./common/Paths"
import { transformKeys } from "./common/transformKeys"

/******************************************************************************
                              Service
******************************************************************************/

class ContractServiceClass {
  /**
   * Upload a PDF and receive an AI clause-by-clause analysis
   */
  async analyzeContract(file: File): Promise<ContractAnalysis> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.CONTRACTS.ANALYZE,
      formData: { file },
      mediaType: "multipart/form-data",
    })
    return transformKeys<ContractAnalysis>(response)
  }

  /**
   * List the current user's contract analyses
   */
  async listAnalyses(
    page = 1,
    pageSize = 20,
  ): Promise<ContractAnalysisListResponse> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CONTRACTS.LIST,
      query: { page, page_size: pageSize },
    })
    return transformKeys<ContractAnalysisListResponse>(response)
  }

  /**
   * Get a specific contract analysis by ID
   */
  async getAnalysis(analysisId: string): Promise<ContractAnalysis> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CONTRACTS.DETAIL(analysisId),
    })
    return transformKeys<ContractAnalysis>(response)
  }

  /**
   * Generate a shareable link for a contract analysis
   */
  async shareAnalysis(analysisId: string): Promise<ContractAnalysis> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.CONTRACTS.SHARE(analysisId),
    })
    return transformKeys<ContractAnalysis>(response)
  }

  /**
   * Retrieve a shared contract analysis by share_id (no auth)
   */
  async getSharedAnalysis(shareId: string): Promise<ContractAnalysis> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.CONTRACTS.SHARED(shareId),
    })
    return transformKeys<ContractAnalysis>(response)
  }
}

/******************************************************************************
                              Export
******************************************************************************/

export const ContractService = new ContractServiceClass()
