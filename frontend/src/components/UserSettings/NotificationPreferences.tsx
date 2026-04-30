/**
 * NotificationPreferences
 * Manage in-app and email notification toggles per notification type
 */

import { AlertCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useUpdateNotificationPreferences } from "@/hooks/mutations/useNotificationMutations"
import { useNotificationPreferences } from "@/hooks/queries/useNotificationQueries"
import type {
  NotificationPreferenceItem,
  NotificationType,
} from "@/models/notification"

/******************************************************************************
                              Constants
******************************************************************************/

interface CategoryGroup {
  label: string
  types: { type: NotificationType; label: string }[]
}

const NOTIFICATION_CATEGORIES: CategoryGroup[] = [
  {
    label: "Journey",
    types: [
      { type: "step_completed", label: "Step Completed" },
      { type: "journey_deadline", label: "Journey Deadline" },
    ],
  },
  {
    label: "Documents",
    types: [
      { type: "document_translated", label: "Document Translated" },
      { type: "translation_failed", label: "Translation Failed" },
    ],
  },
  {
    label: "Calculators",
    types: [{ type: "calculation_saved", label: "Calculation Saved" }],
  },
  {
    label: "Legal",
    types: [{ type: "law_bookmarked", label: "Law Bookmarked" }],
  },
  {
    label: "Payments",
    types: [
      { type: "payment_reminder", label: "Payment Reminder" },
      { type: "subscription_expiring", label: "Subscription Expiring" },
    ],
  },
  {
    label: "System",
    types: [{ type: "system_announcement", label: "System Announcement" }],
  },
  {
    label: "Digest",
    types: [{ type: "weekly_digest", label: "Weekly Digest" }],
  },
]

/******************************************************************************
                              Components
******************************************************************************/

/** Single row for a notification type with in-app and email switches. */
interface IPreferenceRowProps {
  item: NotificationPreferenceItem
  label: string
  onToggle: (
    type: NotificationType,
    field: "isInAppEnabled" | "isEmailEnabled",
    value: boolean,
  ) => void
}

function PreferenceRow(props: Readonly<IPreferenceRowProps>) {
  const { item, label, onToggle } = props

  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            In-App
          </span>
          <Switch
            checked={item.isInAppEnabled}
            onCheckedChange={(v) =>
              onToggle(item.notificationType, "isInAppEnabled", v)
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Email
          </span>
          <Switch
            checked={item.isEmailEnabled}
            onCheckedChange={(v) =>
              onToggle(item.notificationType, "isEmailEnabled", v)
            }
          />
        </div>
      </div>
    </div>
  )
}

/** Default component. Notification preferences management. */
function NotificationPreferences() {
  const { data, isLoading, isError } = useNotificationPreferences()
  const updateMutation = useUpdateNotificationPreferences()

  function handleToggle(
    type: NotificationType,
    field: "isInAppEnabled" | "isEmailEnabled",
    value: boolean,
  ) {
    if (!data) return

    const current = data.preferences.find((p) => p.notificationType === type)
    if (!current) return

    const updated: NotificationPreferenceItem = {
      ...current,
      [field]: value,
    }

    updateMutation.mutate({ preferences: [updated] })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Loading your preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              "skeleton-1",
              "skeleton-2",
              "skeleton-3",
              "skeleton-4",
              "skeleton-5",
            ].map((id) => (
              <Skeleton key={id} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Failed to load notification preferences. Please try again later.
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const prefMap = new Map(data.preferences.map((p) => [p.notificationType, p]))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to be notified for each event type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Column labels */}
        <div className="flex items-center justify-end gap-6 pb-2 border-b mb-2">
          <span className="text-xs font-medium text-muted-foreground w-[72px] text-center hidden sm:block">
            In-App
          </span>
          <span className="text-xs font-medium text-muted-foreground w-[72px] text-center hidden sm:block">
            Email
          </span>
        </div>

        {NOTIFICATION_CATEGORIES.map((category) => (
          <div key={category.label} className="mb-4 last:mb-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {category.label}
            </h4>
            <div className="divide-y">
              {category.types.map((entry) => {
                const pref = prefMap.get(entry.type)
                if (!pref) return null
                return (
                  <PreferenceRow
                    key={entry.type}
                    item={pref}
                    label={entry.label}
                    onToggle={handleToggle}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default NotificationPreferences
