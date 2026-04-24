/**
 * Contract Explainer Mutation Hooks
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import useCustomToast from "@/hooks/useCustomToast"
import { queryKeys } from "@/query/queryKeys"
import { ContractService } from "@/services/ContractService"

/**
 * Upload a PDF and trigger AI contract analysis
 */
export function useAnalyzeContract() {
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  return useMutation({
    mutationFn: (file: File) => ContractService.analyzeContract(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all })
    },
    onError: () => {
      showErrorToast(
        "Could not analyze contract. Please check the file and try again.",
      )
    },
  })
}

/**
 * Generate a shareable link for a contract analysis
 */
export function useShareContractAnalysis(analysisId: string) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  return useMutation({
    mutationFn: () => ContractService.shareAnalysis(analysisId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts.detail(analysisId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts.all,
      })
      showSuccessToast("Shareable link generated.")
    },
    onError: () => {
      showErrorToast("Could not generate share link. Please try again.")
    },
  })
}
