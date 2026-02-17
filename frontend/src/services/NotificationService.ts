/**
 * Notification Service
 * Handles API calls for notifications and preferences
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
  Notification,
  NotificationList,
  NotificationPreferences,
  NotificationPreferencesUpdate,
} from "@/models/notification"
import { PATHS } from "./common/Paths"

/******************************************************************************
                              Functions
******************************************************************************/

/** Convert a snake_case string to camelCase. */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

/** Convert a camelCase string to snake_case. */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
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

/** Recursively convert all object keys from camelCase to snake_case. */
function transformKeysToSnake<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeysToSnake(item)) as T
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        camelToSnake(key),
        transformKeysToSnake(value),
      ]),
    ) as T
  }
  return obj as T
}

/******************************************************************************
                              Service
******************************************************************************/

class NotificationServiceClass {
  async getNotifications(
    limit = 20,
    offset = 0,
    unreadOnly = false,
  ): Promise<NotificationList> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      unread_only: String(unreadOnly),
    })
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: `${PATHS.NOTIFICATIONS.LIST}?${params.toString()}`,
    })
    return transformKeys<NotificationList>(response)
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "PUT",
      url: PATHS.NOTIFICATIONS.READ(notificationId),
    })
    return transformKeys<Notification>(response)
  }

  async markAllRead(): Promise<void> {
    await request(OpenAPI, {
      method: "PUT",
      url: PATHS.NOTIFICATIONS.MARK_ALL_READ,
    })
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await request(OpenAPI, {
      method: "DELETE",
      url: PATHS.NOTIFICATIONS.DELETE(notificationId),
    })
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "GET",
      url: PATHS.NOTIFICATIONS.PREFERENCES,
    })
    return transformKeys<NotificationPreferences>(response)
  }

  async updatePreferences(
    data: NotificationPreferencesUpdate,
  ): Promise<NotificationPreferences> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "PUT",
      url: PATHS.NOTIFICATIONS.PREFERENCES,
      body: transformKeysToSnake(data),
    })
    return transformKeys<NotificationPreferences>(response)
  }
}

export const NotificationService = new NotificationServiceClass()
