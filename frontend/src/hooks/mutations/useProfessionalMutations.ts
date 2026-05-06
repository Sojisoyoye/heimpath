/**
 * Professional Mutation Hooks
 * React Query hooks for professional directory mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import useCustomToast from "@/hooks/useCustomToast"
import type { ContactInquiryCreate, ServiceType } from "@/models/professional"
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

/**
 * Submit a contact inquiry to a professional
 */
export function useSubmitInquiry(professionalId: string) {
  const { showSuccessToast, showErrorToast } = useCustomToast()

  return useMutation({
    mutationFn: (data: ContactInquiryCreate) =>
      ProfessionalService.submitInquiry(professionalId, data),
    onSuccess: () => {
      showSuccessToast("Your inquiry has been sent to the professional.")
    },
    onError: () => {
      showErrorToast("Could not send your inquiry. Please try again.")
    },
  })
}

/**
 * Track a referral click for a professional (fire-and-forget)
 */
export function useTrackClick() {
  return useMutation({
    mutationFn: (professionalId: string) =>
      ProfessionalService.trackClick(professionalId),
  })
}

/**
 * Save a professional to the current user's list
 */
export function useSaveProfessional() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  return useMutation({
    mutationFn: (professionalId: string) =>
      ProfessionalService.saveProfessional(professionalId),
    onSuccess: () => {
      showSuccessToast("Saved")
      queryClient.invalidateQueries({
        queryKey: queryKeys.professionals.saved(),
      })
    },
    onError: () => {
      showErrorToast("Could not save professional. Please try again.")
    },
  })
}

/**
 * Remove a professional from the current user's saved list
 */
export function useUnsaveProfessional() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  return useMutation({
    mutationFn: (professionalId: string) =>
      ProfessionalService.unsaveProfessional(professionalId),
    onSuccess: () => {
      showSuccessToast("Removed")
      queryClient.invalidateQueries({
        queryKey: queryKeys.professionals.saved(),
      })
    },
    onError: () => {
      showErrorToast("Could not remove professional. Please try again.")
    },
  })
}
