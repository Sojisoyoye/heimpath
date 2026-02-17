/**
 * Document domain models
 * TypeScript interfaces for document upload and translation
 */

export type DocumentType =
  | "kaufvertrag"
  | "mietvertrag"
  | "expose"
  | "nebenkostenabrechnung"
  | "grundbuchauszug"
  | "teilungserklaerung"
  | "hausgeldabrechnung"
  | "unknown"

export type DocumentStatus = "uploaded" | "processing" | "completed" | "failed"

export interface DocumentSummary {
  id: string
  originalFilename: string
  fileSizeBytes: number
  pageCount: number
  documentType: DocumentType
  status: DocumentStatus
  createdAt: string
}

export interface TranslatedPage {
  pageNumber: number
  originalText: string
  translatedText: string
}

export interface DetectedClause {
  clauseType: string
  originalText: string
  translatedText: string
  pageNumber: number
  riskLevel: string
}

export interface DocumentRiskWarning {
  originalTerm: string
  translatedTerm: string
  riskLevel: string
  explanation: string
  pageNumber: number | null
}

export interface DocumentTranslation {
  id: string
  documentId: string
  sourceLanguage: string
  targetLanguage: string
  translatedPages: TranslatedPage[]
  clausesDetected: DetectedClause[]
  riskWarnings: DocumentRiskWarning[]
  processingStartedAt: string | null
  processingCompletedAt: string | null
}

export interface DocumentDetail {
  id: string
  originalFilename: string
  fileSizeBytes: number
  pageCount: number
  documentType: DocumentType
  status: DocumentStatus
  errorMessage: string | null
  createdAt: string
  translation: DocumentTranslation | null
}

export interface DocumentStatusInfo {
  id: string
  status: DocumentStatus
  errorMessage: string | null
  pageCount: number
}

export interface DocumentListResponse {
  data: DocumentSummary[]
  total: number
  page: number
  pageSize: number
}
