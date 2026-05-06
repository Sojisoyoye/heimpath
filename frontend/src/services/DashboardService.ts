/**
 * Dashboard Service
 * Handles API calls for the dashboard overview
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type { DashboardOverview } from "@/models/dashboard"
import { PATHS } from "./common/Paths"
import { transformKeys } from "./common/transformKeys"

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
