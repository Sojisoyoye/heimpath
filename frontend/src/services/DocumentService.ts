/**
 * Document Service
 * Handles all API calls related to document upload and translation
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
  DocumentDetail,
  DocumentListResponse,
  DocumentShareResponse,
  DocumentStatusInfo,
  DocumentSummary,
  DocumentTranslation,
  DocumentUsageInfo,
} from "@/models/document"
import { PATHS } from "./common/Paths"
import { transformKeys } from "./common/transformKeys"

interface UploadResponse {
  id: string
  originalFilename: string
  fileSizeBytes: number
  pageCount: number
  documentType: string
  status: string
  journeyStepId: string | null
}

/******************************************************************************
                              Service
******************************************************************************/

class DocumentServiceClass {
  /**
   * Upload a PDF document for translation
   */
  async uploadDocument(
    file: File,
    journeyStepId?: string,
  ): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append("file", file)

    const url = journeyStepId
      ? `${PATHS.DOCUMENTS.UPLOAD}?journey_step_id=${encodeURIComponent(journeyStepId)}`
      : PATHS.DOCUMENTS.UPLOAD

    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url,
      formData: { file },
      mediaType: "multipart/form-data",
    })
    return transformKeys<UploadResponse>(response)
  }

  /**
   * Get documents linked to a specific journey step
   */
  async getDocumentsByStep(stepId: string): Promise<DocumentSummary[]> {
    const response = await request<Record<string, unknown>[]>(OpenAPI, {
      method: "GET",
      url: PATHS.DOCUMENTS.BY_STEP(stepId),
    })
    return (response as Record<string, unknown>[]).map((doc) =>
      transformKeys<DocumentSummary>(doc),
    )
  }

  /**
   * Get paginated list of user's documents with optional filters
   */
  async getDocuments(
    page = 1,
    pageSize = 20,
    search?: string,
    documentType?: string,
    statusFilter?: string,
  ): Promise<DocumentListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })
    if (search) params.set("search", search)
    if (documentType) params.set("document_type", documentType)
    if (statusFilter) params.set("status", statusFilter)

    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.DOCUMENTS.LIST}?${params.toString()}`,
    })
    return transformKeys<DocumentListResponse>(response)
  }

  /**
   * Get full document details with translation
   */
  async getDocument(documentId: string): Promise<DocumentDetail> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.DOCUMENTS.DETAIL(documentId),
    })
    return transformKeys<DocumentDetail>(response)
  }

  /**
   * Get translation results for a document
   */
  async getTranslation(documentId: string): Promise<DocumentTranslation> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.DOCUMENTS.TRANSLATION(documentId),
    })
    return transformKeys<DocumentTranslation>(response)
  }

  /**
   * Get lightweight processing status
   */
  async getStatus(documentId: string): Promise<DocumentStatusInfo> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.DOCUMENTS.STATUS(documentId),
    })
    return transformKeys<DocumentStatusInfo>(response)
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await request(OpenAPI, {
      method: "DELETE",
      url: PATHS.DOCUMENTS.DELETE(documentId),
    })
  }

  /**
   * Generate a shareable link for a document
   */
  async shareDocument(documentId: string): Promise<DocumentShareResponse> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.DOCUMENTS.SHARE(documentId),
    })
    return transformKeys<DocumentShareResponse>(response)
  }

  /**
   * Get a shared document by share_id (no auth required)
   */
  async getSharedDocument(shareId: string): Promise<DocumentDetail> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.DOCUMENTS.SHARED(shareId),
    })
    return transformKeys<DocumentDetail>(response)
  }

  /**
   * Get document usage info for the current user
   */
  async getUsage(): Promise<DocumentUsageInfo> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.DOCUMENTS.USAGE,
    })
    return transformKeys<DocumentUsageInfo>(response)
  }
}

export const DocumentService = new DocumentServiceClass()
