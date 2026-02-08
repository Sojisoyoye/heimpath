/**
 * Legal Query Hooks
 * React Query hooks for legal knowledge base data fetching
 */

import { useQuery } from "@tanstack/react-query";
import { LegalService } from "@/services/LegalService";
import { queryKeys } from "@/query/queryKeys";
import type { LawFilter } from "@/models/legal";

/**
 * Get paginated list of laws with filters
 */
export function useLaws(filters?: LawFilter) {
  return useQuery({
    queryKey: queryKeys.laws.list(filters as Record<string, unknown> | undefined),
    queryFn: () => LegalService.getLaws(filters),
  });
}

/**
 * Get a specific law by ID
 */
export function useLaw(lawId: string) {
  return useQuery({
    queryKey: queryKeys.laws.detail(lawId),
    queryFn: () => LegalService.getLaw(lawId),
    enabled: !!lawId,
  });
}

/**
 * Search laws by query
 */
export function useLawSearch(query: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: queryKeys.laws.search(query),
    queryFn: () => LegalService.searchLaws(query, page, pageSize),
    enabled: query.length >= 2,
  });
}

/**
 * Get law categories
 */
export function useLawCategories() {
  return useQuery({
    queryKey: queryKeys.laws.categories(),
    queryFn: () => LegalService.getCategories(),
    staleTime: 30 * 60 * 1000, // Categories rarely change
  });
}

/**
 * Get user's bookmarked laws
 */
export function useBookmarks() {
  return useQuery({
    queryKey: queryKeys.laws.bookmarks(),
    queryFn: () => LegalService.getBookmarks(),
  });
}

/**
 * Get laws for a specific journey step
 */
export function useLawsByJourneyStep(stepKey: string) {
  return useQuery({
    queryKey: queryKeys.laws.byJourneyStep(stepKey),
    queryFn: () => LegalService.getLawsByJourneyStep(stepKey),
    enabled: !!stepKey,
  });
}
