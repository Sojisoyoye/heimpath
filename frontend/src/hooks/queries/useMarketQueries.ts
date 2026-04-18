/**
 * Market Query Hooks
 * React Query hooks for market comparison data fetching
 */

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/query/queryKeys"
import { CalculatorService } from "@/services/CalculatorService"

/** Fetch all available areas for comparison. Static data — long stale time. */
export function useAreas() {
  return useQuery({
    queryKey: queryKeys.market.areas(),
    queryFn: () => CalculatorService.getAreas(),
    staleTime: 60 * 60 * 1000,
  })
}

/** Fetch comparison metrics for selected area keys. Enabled when 2+ keys. */
export function useCityComparison(keys: string[]) {
  return useQuery({
    queryKey: queryKeys.market.cityComparison(keys),
    queryFn: () => CalculatorService.compareCities(keys),
    enabled: keys.length >= 2,
    staleTime: 30 * 60 * 1000,
  })
}
