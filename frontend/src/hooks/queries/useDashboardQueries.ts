/**
 * Dashboard Query Hooks
 * React Query hook for fetching the dashboard overview
 */

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/query/queryKeys"
import { DashboardService } from "@/services/DashboardService"

/**
 * Get the aggregated dashboard overview for the current user
 */
export function useDashboardOverview() {
  return useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: () => DashboardService.getOverview(),
    staleTime: 60 * 1000, // 1 minute
  })
}
