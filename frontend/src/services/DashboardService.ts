/**
 * Dashboard Service
 * Handles API calls for the dashboard overview
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type { DashboardOverview } from "@/models/dashboard"
import { PATHS } from "./common/Paths"

/******************************************************************************
                              Functions
******************************************************************************/

/** Convert a snake_case string to camelCase. */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

/** Recursively convert all object keys from snake_case to camelCase. */
function transformKeys<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item)) as T
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        snakeToCamel(key),
        transformKeys(value),
      ]),
    ) as T
  }
  return obj as T
}

/******************************************************************************
                              Service
******************************************************************************/

class DashboardServiceClass {
  /**
   * Get the aggregated dashboard overview for the current user
   */
  async getOverview(): Promise<DashboardOverview> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.DASHBOARD.OVERVIEW,
    })
    return transformKeys<DashboardOverview>(response)
  }
}

export const DashboardService = new DashboardServiceClass()
