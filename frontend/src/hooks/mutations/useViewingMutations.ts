import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  PropertyViewingCreate,
  PropertyViewingUpdate,
} from "@/models/viewing"
import { queryKeys } from "@/query/queryKeys"
import { ViewingService } from "@/services/ViewingService"

export function useCreateViewing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PropertyViewingCreate) =>
      ViewingService.createViewing(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.viewings.list() })
    },
  })
}

export function useUpdateViewing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: PropertyViewingUpdate
    }) => ViewingService.updateViewing(id, updates),
    onSuccess: (viewing) => {
      queryClient.setQueryData(queryKeys.viewings.detail(viewing.id), viewing)
      queryClient.invalidateQueries({ queryKey: queryKeys.viewings.list() })
    },
  })
}

export function useDeleteViewing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ViewingService.deleteViewing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.viewings.list() })
    },
  })
}
