import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/query/queryKeys"
import { NotificationService } from "@/services/NotificationService"

export function useNotifications(limit = 20, offset = 0, unreadOnly = false) {
  return useQuery({
    queryKey: queryKeys.notifications.list(limit, offset, unreadOnly),
    queryFn: () =>
      NotificationService.getNotifications(limit, offset, unreadOnly),
    refetchInterval: 30000,
  })
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: () => NotificationService.getPreferences(),
  })
}
