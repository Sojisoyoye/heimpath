/**
 * Profile Header Component
 * Displays user profile summary with avatar and subscription status
 */

import { Building2, Calendar, Crown, Globe, Mail, Zap } from "lucide-react"

import { cn } from "@/common/utils"
import { AvatarUpload } from "@/components/Profile/AvatarUpload"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { SubscriptionTier } from "@/models/user"

interface IProps {
  fullName: string
  email: string
  citizenship?: string
  subscriptionTier: SubscriptionTier
  emailVerified: boolean
  createdAt: string
  avatarUrl?: string | null
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const TIER_CONFIG: Record<
  SubscriptionTier,
  { label: string; icon: typeof Crown; color: string }
> = {
  free: {
    label: "Free",
    icon: Zap,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-400",
  },
  premium: {
    label: "Premium",
    icon: Crown,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-400",
  },
  enterprise: {
    label: "Enterprise",
    icon: Building2,
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-400",
  },
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Format date for display. */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Profile header with user info. */
function ProfileHeader(props: IProps) {
  const {
    fullName,
    email,
    citizenship,
    subscriptionTier,
    emailVerified,
    createdAt,
    avatarUrl,
    className,
  } = props

  const tierConfig = TIER_CONFIG[subscriptionTier]
  const TierIcon = tierConfig.icon

  return (
    <Card className={cn(className)}>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <AvatarUpload avatarUrl={avatarUrl} fullName={fullName} />

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{fullName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn("gap-1", tierConfig.color)}>
                    <TierIcon className="h-3 w-3" />
                    {tierConfig.label}
                  </Badge>
                  {emailVerified ? (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-600"
                    >
                      Verified
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-amber-600 border-amber-600"
                    >
                      Unverified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{email}</span>
              </div>
              {citizenship && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>{citizenship}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Member since {formatDate(createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ProfileHeader }
