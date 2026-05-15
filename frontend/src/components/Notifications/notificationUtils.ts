/**
 * Shared utilities for notification components
 */

import type { useNavigate } from "@tanstack/react-router"
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

type NavigateFn = ReturnType<typeof useNavigate>

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

// Known parameterised route patterns from backend notification action_url values.
// TanStack Router requires typed params for these — a plain string path like
// "/laws/some-uuid" does not match the "$lawId" segment at runtime.
const LAW_PATTERN = /^\/laws\/([^/?#]+)$/
const JOURNEY_PATTERN = /^\/journeys\/([^/?#]+)$/
const DOCUMENT_PATTERN = /^\/documents\/([^/?#]+)$/

/**
 * Navigate to a notification action URL using typed TanStack Router paths.
 *
 * Parameterised routes (e.g. /laws/{id}) must be dispatched with explicit
 * `params` so the router can match the dynamic segment.  Static routes and
 * query-param URLs fall back to a direct `to` string navigation.
 */
export function navigateToActionUrl(
  navigate: NavigateFn,
  actionUrl: string,
): void {
  const lawMatch = actionUrl.match(LAW_PATTERN)
  if (lawMatch) {
    navigate({ to: "/laws/$lawId", params: { lawId: lawMatch[1] } })
    return
  }

  const journeyMatch = actionUrl.match(JOURNEY_PATTERN)
  if (journeyMatch) {
    navigate({
      to: "/journeys/$journeyId",
      params: { journeyId: journeyMatch[1] },
      search: { phase: undefined },
    })
    return
  }

  const documentMatch = actionUrl.match(DOCUMENT_PATTERN)
  if (documentMatch) {
    navigate({
      to: "/documents/$documentId",
      params: { documentId: documentMatch[1] },
    })
    return
  }

  // Static routes (/notifications) and query-param paths (/calculators?tab=…)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigate({ to: actionUrl as any })
}

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
