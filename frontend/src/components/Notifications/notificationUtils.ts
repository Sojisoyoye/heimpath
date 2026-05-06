/**
 * Shared utilities for notification components
 */

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
  XCircle,
} from "lucide-react"
import type { NotificationType } from "@/models/notification"

/******************************************************************************
                              Constants
******************************************************************************/

export const NOTIFICATION_ICONS: Record<NotificationType, typeof Bell> = {
  step_completed: CheckCircle,
  document_translated: FileText,
  translation_failed: XCircle,
  calculation_saved: Calculator,
  law_bookmarked: Bookmark,
  journey_deadline: Clock,
  payment_reminder: CreditCard,
  subscription_expiring: AlertTriangle,
  system_announcement: Info,
  weekly_digest: Bell,
}

/******************************************************************************
                              Functions
******************************************************************************/

export function getRelativeTime(dateString: string): string {
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
