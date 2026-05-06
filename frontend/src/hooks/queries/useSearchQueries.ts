/**
 * Search Query Hooks
 * React Query hooks for global search
 */

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/query/queryKeys"
import { SearchService } from "@/services/SearchService"

/**
 * Global search across laws and articles
 */
export function useGlobalSearch(query: string, limit = 10) {
  return useQuery({
    queryKey: queryKeys.search.global(query),
    queryFn: () => SearchService.globalSearch(query, limit),
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // 30s — keep results fresh while dialog is open
  })
}
