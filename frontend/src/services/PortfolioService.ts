/**
 * Portfolio Service
 * Handles all API calls related to rental property management
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
  PortfolioProperty,
  PortfolioPropertyInput,
  PortfolioPropertySummary,
  PortfolioSummary,
  PortfolioTransaction,
  PortfolioTransactionInput,
} from "@/models/portfolio"
import { PATHS } from "./common/Paths"
import { transformKeys, transformKeysToSnake } from "./common/transformKeys"

interface PropertyListResponse {
  data: PortfolioPropertySummary[]
  count: number
}

interface TransactionListResponse {
  data: PortfolioTransaction[]
  count: number
}

/******************************************************************************
                              Service
******************************************************************************/

class PortfolioServiceClass {
  /**
   * Create a new portfolio property
   */
  async createProperty(
    input: PortfolioPropertyInput,
  ): Promise<PortfolioProperty> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.PORTFOLIO.PROPERTIES,
      body: transformKeysToSnake(input),
      mediaType: "application/json",
    })
    return transformKeys<PortfolioProperty>(response)
  }

  /**
   * Get all properties for the current user
   */
  async getProperties(): Promise<PropertyListResponse> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.PORTFOLIO.PROPERTIES,
    })
    return transformKeys<PropertyListResponse>(response)
  }

  /**
   * Get a single property by ID
   */
  async getProperty(id: string): Promise<PortfolioProperty> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.PORTFOLIO.PROPERTY_DETAIL(id),
    })
    return transformKeys<PortfolioProperty>(response)
  }

  /**
   * Partially update a property
   */
  async updateProperty(
    id: string,
    input: Partial<PortfolioPropertyInput>,
  ): Promise<PortfolioProperty> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "PATCH",
      url: PATHS.PORTFOLIO.PROPERTY_DETAIL(id),
      body: transformKeysToSnake(input),
      mediaType: "application/json",
    })
    return transformKeys<PortfolioProperty>(response)
  }

  /**
   * Delete a property
   */
  async deleteProperty(id: string): Promise<void> {
    await request(OpenAPI, {
      method: "DELETE",
      url: PATHS.PORTFOLIO.PROPERTY_DETAIL(id),
    })
  }

  /**
   * Create a transaction for a property
   */
  async createTransaction(
    propertyId: string,
    input: PortfolioTransactionInput,
  ): Promise<PortfolioTransaction> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.PORTFOLIO.TRANSACTIONS(propertyId),
      body: transformKeysToSnake(input),
      mediaType: "application/json",
    })
    return transformKeys<PortfolioTransaction>(response)
  }

  /**
   * Get transactions for a property with optional date filtering
   */
  async getTransactions(
    propertyId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<TransactionListResponse> {
    const params = new URLSearchParams()
    if (dateFrom) params.append("date_from", dateFrom)
    if (dateTo) params.append("date_to", dateTo)

    const queryStr = params.toString()
    const url = queryStr
      ? `${PATHS.PORTFOLIO.TRANSACTIONS(propertyId)}?${queryStr}`
      : PATHS.PORTFOLIO.TRANSACTIONS(propertyId)

    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url,
    })
    return transformKeys<TransactionListResponse>(response)
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: string): Promise<void> {
    await request(OpenAPI, {
      method: "DELETE",
      url: PATHS.PORTFOLIO.DELETE_TRANSACTION(id),
    })
  }

  /**
   * Get portfolio summary KPIs
   */
  async getSummary(): Promise<PortfolioSummary> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.PORTFOLIO.SUMMARY,
    })
    return transformKeys<PortfolioSummary>(response)
  }
}

export const PortfolioService = new PortfolioServiceClass()
