/**
 * Glossary Query Hooks
 * React Query hooks for German real estate glossary data fetching
 */

import { useQuery } from "@tanstack/react-query"
import type { GlossaryFilter } from "@/models/glossary"
import { queryKeys } from "@/query/queryKeys"
import { GlossaryService } from "@/services/GlossaryService"

/**
 * Get paginated list of glossary terms
 */
export function useGlossaryTerms(filters?: GlossaryFilter) {
  return useQuery({
    queryKey: queryKeys.glossary.list(
      filters as Record<string, unknown> | undefined,
    ),
    queryFn: () => GlossaryService.getTerms(filters),
  })
}

/**
 * Get glossary term detail by slug
 */
export function useGlossaryTerm(slug: string) {
  return useQuery({
    queryKey: queryKeys.glossary.detail(slug),
    queryFn: () => GlossaryService.getTerm(slug),
    enabled: !!slug,
  })
}

/**
 * Search glossary terms by query
 */
export function useGlossarySearch(query: string, limit = 20) {
  return useQuery({
    queryKey: queryKeys.glossary.search(query),
    queryFn: () => GlossaryService.searchTerms(query, limit),
    enabled: query.length >= 2,
  })
}

/**
 * Get glossary categories with counts
 */
export function useGlossaryCategories() {
  return useQuery({
    queryKey: queryKeys.glossary.categories(),
    queryFn: () => GlossaryService.getCategories(),
    staleTime: 30 * 60 * 1000,
  })
}
