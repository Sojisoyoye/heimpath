/**
 * Article Mutation Hooks
 * React Query hooks for content library mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/query/queryKeys"
import { ArticleService } from "@/services/ArticleService"

/**
 * Rate an article as helpful or not helpful
 */
export function useRateArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slug, isHelpful }: { slug: string; isHelpful: boolean }) =>
      ArticleService.rateArticle(slug, isHelpful),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.articles.detail(variables.slug),
      })
    },
  })
}
