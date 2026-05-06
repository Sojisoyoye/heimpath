/**
 * Professional Query Hooks
 * React Query hooks for professional directory data fetching
 */

import { useQuery } from "@tanstack/react-query"
import type { ProfessionalFilter } from "@/models/professional"
import { queryKeys } from "@/query/queryKeys"
import { ProfessionalService } from "@/services/ProfessionalService"

/**
 * Get paginated list of professionals with filters
 */
export function useProfessionals(filters?: ProfessionalFilter) {
  return useQuery({
    queryKey: queryKeys.professionals.list(
      filters as Record<string, unknown> | undefined,
    ),
    queryFn: () => ProfessionalService.getProfessionals(filters),
  })
}

/**
 * Get professional detail with reviews
 */
export function useProfessional(id: string) {
  return useQuery({
    queryKey: queryKeys.professionals.detail(id),
    queryFn: () => ProfessionalService.getProfessional(id),
    enabled: !!id,
  })
}

/**
 * Get available filter options (cities and languages)
 */
export function useProfessionalFilterOptions() {
  return useQuery({
    queryKey: queryKeys.professionals.filterOptions(),
    queryFn: () => ProfessionalService.getFilterOptions(),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get all saved professionals for the current user
 */
export function useSavedProfessionals() {
  return useQuery({
    queryKey: queryKeys.professionals.saved(),
    queryFn: () => ProfessionalService.getSavedProfessionals(),
  })
}
