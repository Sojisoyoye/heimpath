/**
 * Portfolio Mutation Hooks
 * React Query hooks for portfolio mutations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  PortfolioPropertyInput,
  PortfolioTransactionInput,
} from "@/models/portfolio"
import { queryKeys } from "@/query/queryKeys"
import { PortfolioService } from "@/services/PortfolioService"

/**
 * Create a new portfolio property
 */
export function useCreateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PortfolioPropertyInput) =>
      PortfolioService.createProperty(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.properties(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.summary(),
      })
    },
  })
}

/**
 * Update an existing portfolio property
 */
export function useUpdateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<PortfolioPropertyInput>
    }) => PortfolioService.updateProperty(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.propertyDetail(variables.id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.properties(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.summary(),
      })
    },
  })
}

/**
 * Delete a portfolio property
 */
export function useDeleteProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => PortfolioService.deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.properties(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.summary(),
      })
    },
  })
}

/**
 * Create a transaction for a property
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      propertyId,
      input,
    }: {
      propertyId: string
      input: PortfolioTransactionInput
    }) => PortfolioService.createTransaction(propertyId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.transactions(variables.propertyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.costSummary(variables.propertyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.summary(),
      })
    },
  })
}

/**
 * Delete a transaction
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      transactionId,
    }: {
      transactionId: string
      propertyId: string
    }) => PortfolioService.deleteTransaction(transactionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.transactions(variables.propertyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.costSummary(variables.propertyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.summary(),
      })
    },
  })
}
