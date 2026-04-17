/**
 * Portfolio Query Hooks
 * React Query hooks for portfolio data fetching
 */

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/query/queryKeys"
import { PortfolioService } from "@/services/PortfolioService"

/**
 * Get all properties for the current user
 */
export function usePortfolioProperties() {
  return useQuery({
    queryKey: queryKeys.portfolio.properties(),
    queryFn: () => PortfolioService.getProperties(),
  })
}

/**
 * Get a single property by ID
 */
export function usePortfolioProperty(id: string) {
  return useQuery({
    queryKey: queryKeys.portfolio.propertyDetail(id),
    queryFn: () => PortfolioService.getProperty(id),
    enabled: !!id,
  })
}

/**
 * Get transactions for a property
 */
export function usePortfolioTransactions(propertyId: string) {
  return useQuery({
    queryKey: queryKeys.portfolio.transactions(propertyId),
    queryFn: () => PortfolioService.getTransactions(propertyId),
    enabled: !!propertyId,
  })
}

/**
 * Get portfolio summary KPIs
 */
export function usePortfolioSummary() {
  return useQuery({
    queryKey: queryKeys.portfolio.summary(),
    queryFn: () => PortfolioService.getSummary(),
  })
}
