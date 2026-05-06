/**
 * Legal Mutation Hooks
 * React Query hooks for legal knowledge base mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/query/queryKeys"
import { LegalService } from "@/services/LegalService"

/**
 * Create a bookmark for a law
 */
export function useCreateBookmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ lawId, notes }: { lawId: string; notes?: string }) =>
      LegalService.createBookmark(lawId, notes),
    onSuccess: (_data, variables) => {
      // Invalidate bookmarks list
      queryClient.invalidateQueries({ queryKey: queryKeys.laws.bookmarks() })

      // Update the law's bookmark status in cache
      queryClient.setQueryData(
        queryKeys.laws.detail(variables.lawId),
        (old: unknown) => {
          if (!old) return old
          return { ...old, isBookmarked: true }
        },
      )
    },
  })
}

/**
 * Delete a bookmark
 */
export function useDeleteBookmark() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (lawId: string) => LegalService.deleteBookmark(lawId),
    onSuccess: (_data, lawId) => {
      // Invalidate bookmarks list
      queryClient.invalidateQueries({ queryKey: queryKeys.laws.bookmarks() })

      // Update the law's bookmark status in cache
      queryClient.setQueryData(queryKeys.laws.detail(lawId), (old: unknown) => {
        if (!old) return old
        return { ...old, isBookmarked: false }
      })
    },
  })
}

/**
 * Toggle bookmark (convenience hook)
 */
export function useToggleBookmark() {
  const createBookmark = useCreateBookmark()
  const deleteBookmark = useDeleteBookmark()

  return {
    toggle: (lawId: string, isCurrentlyBookmarked: boolean, notes?: string) => {
      if (isCurrentlyBookmarked) {
        return deleteBookmark.mutate(lawId)
      }
      return createBookmark.mutate({ lawId, notes })
    },
    isPending: createBookmark.isPending || deleteBookmark.isPending,
  }
}
