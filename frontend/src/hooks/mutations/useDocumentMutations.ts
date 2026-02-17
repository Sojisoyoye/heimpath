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
