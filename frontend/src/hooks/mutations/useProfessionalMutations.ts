/**
 * Professional Mutation Hooks
 * React Query hooks for professional directory mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ServiceType } from "@/models/professional"
import { queryKeys } from "@/query/queryKeys"
import { ProfessionalService } from "@/services/ProfessionalService"

interface SubmitReviewInput {
  rating: number
  comment?: string
  serviceUsed?: ServiceType
  languageUsed?: string
  wouldRecommend?: boolean
  responseTimeRating?: number
}

/**
 * Submit a review for a professional
 */
export function useSubmitReview(professionalId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SubmitReviewInput) =>
      ProfessionalService.submitReview(professionalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.professionals.detail(professionalId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.professionals.list(),
      })
    },
  })
}
