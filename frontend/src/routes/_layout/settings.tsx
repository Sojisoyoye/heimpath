/**
 * Settings Page
 * User account settings and profile management
 */

import { createFileRoute } from "@tanstack/react-router"
import { Crown, Settings, Shield, User } from "lucide-react"
import {
  DataExportButton,
  DeleteAccountModal,
  ProfileHeader,
  SubscriptionCard,
  SubscriptionUpgrade,
} from "@/components/Profile"
import ChangePassword from "@/components/UserSettings/ChangePassword"
import UserInformation from "@/components/UserSettings/UserInformation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useAuth from "@/hooks/useAuth"

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/_layout/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings - HeimPath" }],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Profile tab content. */
function ProfileTab() {
  const { user } = useAuth()

  if (!user) return null

  // Cast to access extended properties that may be added to backend later
  const extendedUser = user as typeof user & {
    citizenship?: string
    subscription_tier?: "free" | "premium" | "enterprise"
    email_verified?: boolean
  }

  return (
    <div className="space-y-6">
      <ProfileHeader
        fullName={user.full_name || "User"}
        email={user.email}
        citizenship={extendedUser.citizenship}
        subscriptionTier={extendedUser.subscription_tier || "free"}
        emailVerified={extendedUser.email_verified ?? false}
        createdAt={user.created_at || new Date().toISOString()}
      />
      <UserInformation />
    </div>
  )
}

/** Subscription tab content. */
function SubscriptionTab() {
  const { user } = useAuth()

  // Cast to access extended properties that may be added to backend later
  const extendedUser = user as typeof user & {
    subscription_tier?: "free" | "premium" | "enterprise"
  }
  const currentTier = extendedUser?.subscription_tier || "free"

  return (
    <div className="space-y-6">
      <SubscriptionCard tier={currentTier} />
      <SubscriptionUpgrade currentTier={currentTier} />
    </div>
  )
}

/** Security tab content. */
function SecurityTab() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <ChangePassword />
      <DataExportButton />
      {user && <DeleteAccountModal email={user.email} />}
    </div>
  )
}

/** Default component. Settings page with tabs. */
function SettingsPage() {
  const { user: currentUser } = useAuth()

  if (!currentUser) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Subscription</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <SubscriptionTab />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default SettingsPage
