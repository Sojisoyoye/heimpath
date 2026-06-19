import { useQuery } from "@tanstack/react-query"
import { isLoggedIn } from "@/hooks/useAuth"
import { queryKeys } from "@/query/queryKeys"
import { ViewingService } from "@/services/ViewingService"

export function useViewings() {
  return useQuery({
    queryKey: queryKeys.viewings.list(),
    queryFn: () => ViewingService.listViewings(),
    enabled: isLoggedIn(),
  })
}

export function useViewing(id: string) {
  return useQuery({
    queryKey: queryKeys.viewings.detail(id),
    queryFn: () => ViewingService.getViewing(id),
    enabled: !!id,
  })
}
