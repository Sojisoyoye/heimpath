/**
 * Document mutation hooks
 * React Query hooks for document upload and modifications
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/query/queryKeys"
import { DocumentService } from "@/services/DocumentService"

export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => DocumentService.uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.all,
      })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) =>
      DocumentService.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.all,
      })
    },
  })
}

export function useShareDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) =>
      DocumentService.shareDocument(documentId),
    onSuccess: (_data, documentId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.detail(documentId),
      })
    },
  })
}
