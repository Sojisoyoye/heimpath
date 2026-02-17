/**
 * Document Service
 * Handles all API calls related to document upload and translation
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
  DocumentDetail,
  DocumentListResponse,
  DocumentStatusInfo,
  DocumentTranslation,
} from "@/models/document"
import { PATHS } from "./common/Paths"

interface UploadResponse {
  id: string
  originalFilename: string
  fileSizeBytes: number
  pageCount: number
  documentType: string
  status: string
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

class DocumentServiceClass {
  /**
   * Upload a PDF document for translation
   */
  async uploadDocument(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append("file", file)

    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.DOCUMENTS.UPLOAD,
      formData: { file },
      mediaType: "multipart/form-data",
    })
    return transformKeys<UploadResponse>(response)
  }

  /**
   * Get paginated list of user's documents
   */
  async getDocuments(page = 1, pageSize = 20): Promise<DocumentListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })
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
}

export const DocumentService = new DocumentServiceClass()
