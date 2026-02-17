/**
 * Document query hooks
 * React Query hooks for fetching document data
 */

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/query/queryKeys"
import { DocumentService } from "@/services/DocumentService"

export function useDocuments(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: queryKeys.documents.list(page),
    queryFn: () => DocumentService.getDocuments(page, pageSize),
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
