/**
 * Notification Center
 * Full paginated notification history with filter tabs and bulk actions
 */

import { useNavigate } from "@tanstack/react-router"
import { Bell, ChevronRight, Trash2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/hooks/mutations/useNotificationMutations"
import { useNotifications } from "@/hooks/queries/useNotificationQueries"
import type { Notification } from "@/models/notification"
import { getRelativeTime, NOTIFICATION_ICONS } from "./notificationUtils"

/******************************************************************************
                              Constants
******************************************************************************/

const PAGE_SIZE = 20

/******************************************************************************
                              Components
******************************************************************************/

interface INotificationRowProps {
  notification: Notification
}

/** Single notification row with click-through, read indicator, and delete. */
function NotificationRow({ notification }: INotificationRowProps) {
  const navigate = useNavigate()
  const markRead = useMarkNotificationRead()
  const deleteNotification = useDeleteNotification()

  const Icon = NOTIFICATION_ICONS[notification.type] ?? Bell

  function handleClick() {
    if (!notification.isRead) {
      markRead.mutate(notification.id)
    }
    if (notification.actionUrl) {
      navigate({ to: notification.actionUrl })
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    deleteNotification.mutate(notification.id)
  }

  const innerContent = (
    <>
      {!notification.isRead && (
        <span className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
      <Icon
        className={`mt-0.5 size-5 shrink-0 ${
          notification.isRead ? "text-muted-foreground" : "text-primary"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${
            notification.isRead ? "text-muted-foreground" : "font-medium"
          }`}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          {getRelativeTime(notification.createdAt)}
        </p>
      </div>
      <div className="ml-2 flex shrink-0 items-center gap-1">
        {notification.actionUrl && (
          <ChevronRight className="size-4 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          title="Delete notification"
          aria-label="Delete notification"
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </>
  )

  if (notification.actionUrl) {
    return (
      <button
        type="button"
        className="group relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
        onClick={handleClick}
      >
        {innerContent}
      </button>
    )
  }

  return (
    <div className="group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
      {innerContent}
    </div>
  )
}

/** Default component. Paginated notification history with filter tabs. */
function NotificationCenter() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(0)

  const offset = page * PAGE_SIZE
  const { data, isLoading, isError } = useNotifications(
    PAGE_SIZE,
    offset,
    unreadOnly,
  )
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data?.data ?? []
  const totalCount = data?.count ?? 0
  const unreadCount = data?.unreadCount ?? 0
  const hasNextPage = offset + PAGE_SIZE < totalCount
  const hasPrevPage = page > 0

  function handleTabChange(value: string) {
    setUnreadOnly(value === "unread")
    setPage(0)
  }

  if (isLoading) {
    return (
      <div className="space-y-1">
        {["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"].map((id) => (
          <div key={id} className="flex items-start gap-3 px-4 py-3">
            <Skeleton className="mt-0.5 size-5 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">
          Failed to load notifications. Please try again later.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs defaultValue="all" onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Bell className="size-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">
              {unreadOnly ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              {unreadOnly
                ? "You're all caught up!"
                : "Notifications will appear here as you use HeimPath."}
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
      )}

      {(hasPrevPage || hasNextPage) && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrevPage}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of{" "}
            {totalCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { NotificationCenter }
