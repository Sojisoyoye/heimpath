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
import { transformKeys, transformKeysToSnake } from "./common/transformKeys"

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
