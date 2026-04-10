/**
 * Document query hooks
 * React Query hooks for fetching document data
 */

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/query/queryKeys"
import { DocumentService } from "@/services/DocumentService"

interface IDocumentFilters extends Record<string, unknown> {
  search?: string
  documentType?: string
  status?: string
}

export function useDocuments(
  page = 1,
  pageSize = 20,
  filters?: IDocumentFilters,
) {
  return useQuery({
    queryKey: queryKeys.documents.list(page, filters),
    queryFn: () =>
      DocumentService.getDocuments(
        page,
        pageSize,
        filters?.search,
        filters?.documentType,
        filters?.status,
      ),
  })
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: queryKeys.documents.detail(documentId),
    queryFn: () => DocumentService.getDocument(documentId),
    enabled: !!documentId,
  })
}

export function useDocumentTranslation(documentId: string) {
  return useQuery({
    queryKey: queryKeys.documents.translation(documentId),
    queryFn: () => DocumentService.getTranslation(documentId),
    enabled: !!documentId,
  })
}

export function useDocumentStatus(documentId: string, isProcessing: boolean) {
  return useQuery({
    queryKey: queryKeys.documents.status(documentId),
    queryFn: () => DocumentService.getStatus(documentId),
    enabled: !!documentId && isProcessing,
    refetchInterval: isProcessing ? 3000 : false,
  })
}

export function useSharedDocument(shareId: string) {
  return useQuery({
    queryKey: queryKeys.documents.shared(shareId),
    queryFn: () => DocumentService.getSharedDocument(shareId),
    enabled: !!shareId,
  })
}

export function useDocumentUsage() {
  return useQuery({
    queryKey: queryKeys.documents.usage(),
    queryFn: () => DocumentService.getUsage(),
  })
}
