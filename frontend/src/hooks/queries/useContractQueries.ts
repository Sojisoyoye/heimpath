/**
 * Contract Explainer Query Hooks
 * Read-only queries for contract analysis data
 */

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/query/queryKeys"
import { ContractService } from "@/services/ContractService"

/**
 * Fetch the current user's list of contract analyses
 */
export function useContractAnalyses(page = 1) {
  return useQuery({
    queryKey: queryKeys.contracts.list(page),
    queryFn: () => ContractService.listAnalyses(page),
  })
}

/**
 * Fetch a single contract analysis by ID
 */
export function useContractAnalysis(analysisId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contracts.detail(analysisId ?? ""),
    queryFn: () => ContractService.getAnalysis(analysisId!),
    enabled: !!analysisId,
  })
}

/**
 * Fetch a shared contract analysis by share_id (no auth required)
 */
export function useSharedContractAnalysis(shareId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contracts.shared(shareId ?? ""),
    queryFn: () => ContractService.getSharedAnalysis(shareId!),
    enabled: !!shareId,
  })
}
