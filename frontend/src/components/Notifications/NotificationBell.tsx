import { useNavigate } from "@tanstack/react-router"
import {
  AlertTriangle,
  Bell,
  Bookmark,
  Calculator,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Info,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/hooks/mutations/useNotificationMutations"
import { useNotifications } from "@/hooks/queries/useNotificationQueries"
import type { Notification, NotificationType } from "@/models/notification"

// ***************************************************************************
//                              Constants
// ***************************************************************************

const NOTIFICATION_ICONS: Record<NotificationType, typeof Bell> = {
  step_completed: CheckCircle,
  document_translated: FileText,
  calculation_saved: Calculator,
  law_bookmarked: Bookmark,
  journey_deadline: Clock,
  payment_reminder: CreditCard,
  subscription_expiring: AlertTriangle,
  system_announcement: Info,
}

// ***************************************************************************
//                              Components
// ***************************************************************************

interface INotificationItemProps {
  notification: Notification
  onItemClick: (notification: Notification) => void
}

function NotificationItem({
  notification,
  onItemClick,
}: INotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type] || Bell
  const timeAgo = getRelativeTime(notification.createdAt)

  return (
    <DropdownMenuItem
      className="flex cursor-pointer items-start gap-3 p-3"
      onClick={() => onItemClick(notification)}
    >
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${notification.isRead ? "text-muted-foreground" : "text-primary"}`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-tight ${notification.isRead ? "text-muted-foreground" : "font-medium"}`}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">{timeAgo}</p>
      </div>
      {!notification.isRead && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
      )}
    </DropdownMenuItem>
  )
}

// ***************************************************************************
//                              Functions
// ***************************************************************************

function getRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

// ***************************************************************************
//                              Main Component
// ***************************************************************************

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const { data } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = data?.unreadCount ?? 0
  const notifications = data?.data ?? []

  function handleItemClick(notification: Notification) {
    if (!notification.isRead) {
      markRead.mutate(notification.id)
    }
    setOpen(false)
    if (notification.actionUrl) {
      navigate({ to: notification.actionUrl })
    }
  }

  function handleMarkAllRead() {
    markAllRead.mutate()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onItemClick={handleItemClick}
                />
              ))
            )}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ***************************************************************************
//                              Export
// ***************************************************************************

export default NotificationBell
