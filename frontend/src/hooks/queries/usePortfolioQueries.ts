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
 * Get running-cost summary for a property
 */
export function usePortfolioCostSummary(propertyId: string) {
  return useQuery({
    queryKey: queryKeys.portfolio.costSummary(propertyId),
    queryFn: () => PortfolioService.getCostSummary(propertyId),
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

/**
 * Get Anlage V rental income tax summary for a property and year
 */
export function usePortfolioTaxSummary(propertyId: string, year: number) {
  return useQuery({
    queryKey: queryKeys.portfolio.taxSummary(propertyId, year),
    queryFn: () => PortfolioService.getTaxSummary(propertyId, year),
    enabled: !!propertyId && year > 2000,
  })
}

/**
 * Get monthly portfolio performance (trailing 12 months)
 */
export function usePortfolioPerformance() {
  return useQuery({
    queryKey: queryKeys.portfolio.performance(),
    queryFn: () => PortfolioService.getPerformance(),
  })
}
