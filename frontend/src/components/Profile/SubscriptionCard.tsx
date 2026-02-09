/**
 * Subscription Card Component
 * Displays current subscription plan and status
 */

import { Crown, Zap, Building2, Check } from "lucide-react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { SubscriptionTier } from "@/models/user"

interface IProps {
  tier: SubscriptionTier
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const TIER_CONFIG: Record<
  SubscriptionTier,
  {
    label: string
    icon: typeof Crown
    description: string
    color: string
    features: string[]
  }
> = {
  free: {
    label: "Free Plan",
    icon: Zap,
    description: "Basic access to HeimPath features",
    color: "text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400",
    features: [
      "1 active journey",
      "Basic legal knowledge base",
      "Standard calculators",
      "Community support",
    ],
  },
  premium: {
    label: "Premium Plan",
    icon: Crown,
    description: "Full access to all HeimPath features",
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
    features: [
      "Unlimited journeys",
      "Full legal knowledge base",
      "Advanced calculators",
      "Document translation credits",
      "Priority email support",
      "Expert consultations",
    ],
  },
  enterprise: {
    label: "Enterprise Plan",
    icon: Building2,
    description: "For agencies and property professionals",
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
    features: [
      "Everything in Premium",
      "Team collaboration",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
    ],
  },
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Subscription card showing current plan. */
function SubscriptionCard(props: IProps) {
  const { tier, className } = props

  const config = TIER_CONFIG[tier]
  const Icon = config.icon

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div
        className={cn(
          "absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-20",
          tier === "free" && "bg-gray-400",
          tier === "premium" && "bg-blue-400",
          tier === "enterprise" && "bg-purple-400"
        )}
      />
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Icon className={cn("h-5 w-5", config.color.split(" ")[0])} />
              {config.label}
            </CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          <Badge className={cn(config.color)}>{tier.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm font-medium">Included features:</p>
          <ul className="space-y-2">
            {config.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { SubscriptionCard }
