export type NotificationType =
  | "step_completed"
  | "document_translated"
  | "calculation_saved"
  | "law_bookmarked"
  | "journey_deadline"
  | "payment_reminder"
  | "subscription_expiring"
  | "system_announcement"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  actionUrl: string | null
  createdAt: string
}

export interface NotificationList {
  data: Notification[]
  count: number
  unreadCount: number
}

export interface NotificationPreferenceItem {
  notificationType: NotificationType
  isInAppEnabled: boolean
  isEmailEnabled: boolean
}

export interface NotificationPreferences {
  preferences: NotificationPreferenceItem[]
}

export interface NotificationPreferencesUpdate {
  preferences: NotificationPreferenceItem[]
}
