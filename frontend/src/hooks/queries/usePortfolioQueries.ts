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

/** Earliest year for which German digital tax records are typically available. */
const MIN_TAX_YEAR = 1990

/**
 * Get Anlage V rental income tax summary for a property and year
 */
export function usePortfolioTaxSummary(propertyId: string, year: number) {
  return useQuery({
    queryKey: queryKeys.portfolio.taxSummary(propertyId, year),
    queryFn: () => PortfolioService.getTaxSummary(propertyId, year),
    enabled: !!propertyId && year >= MIN_TAX_YEAR,
    // Tax summary only changes when transactions are added/updated for this year.
    staleTime: 5 * 60 * 1000, // 5 minutes
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
