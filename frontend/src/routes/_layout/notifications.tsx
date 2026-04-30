/**
 * Notifications Page
 * Full notification history at /notifications
 */

import { createFileRoute, Link } from "@tanstack/react-router"
import { Settings } from "lucide-react"
import { NotificationCenter } from "@/components/Notifications/NotificationCenter"
import { Button } from "@/components/ui/button"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [{ title: "Notifications - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Notifications history page. */
function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Your full notification history
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          asChild
          title="Notification settings"
        >
          <Link to="/settings">
            <Settings className="size-5" />
          </Link>
        </Button>
      </div>

      <NotificationCenter />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default NotificationsPage
