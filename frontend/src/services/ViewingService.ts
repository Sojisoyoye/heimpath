import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
  PropertyViewing,
  PropertyViewingCreate,
  PropertyViewingListResponse,
  PropertyViewingUpdate,
} from "@/models/viewing"
import { PATHS } from "./common/Paths"
import { transformKeys, transformKeysToSnake } from "./common/transformKeys"

class ViewingServiceClass {
  async listViewings(): Promise<PropertyViewingListResponse> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.VIEWINGS.LIST,
    })
    const raw = response as { data: Record<string, unknown>[]; count: number }
    return {
      data: raw.data.map((v) => transformKeys<PropertyViewing>(v)),
      count: raw.count,
    }
  }

  async createViewing(input: PropertyViewingCreate): Promise<PropertyViewing> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "POST",
      url: PATHS.VIEWINGS.LIST,
      body: transformKeysToSnake(input as unknown as Record<string, unknown>),
    })
    return transformKeys<PropertyViewing>(response)
  }

  async getViewing(id: string): Promise<PropertyViewing> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.VIEWINGS.DETAIL(id),
    })
    return transformKeys<PropertyViewing>(response)
  }

  async updateViewing(
    id: string,
    updates: PropertyViewingUpdate,
  ): Promise<PropertyViewing> {
    const body = transformKeysToSnake(updates as Record<string, unknown>)
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "PATCH",
      url: PATHS.VIEWINGS.DETAIL(id),
      body,
    })
    return transformKeys<PropertyViewing>(response)
  }

  async deleteViewing(id: string): Promise<void> {
    await request(OpenAPI, {
      method: "DELETE",
      url: PATHS.VIEWINGS.DETAIL(id),
    })
  }
}

export const ViewingService = new ViewingServiceClass()
