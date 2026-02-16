/**
 * Subscription Upgrade Component
 * Displays upgrade options with pricing
 */

import { Building2, Check, Crown, Loader2, Zap } from "lucide-react"
import { useState } from "react"

import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { SubscriptionTier } from "@/models/user"

interface IProps {
  currentTier: SubscriptionTier
  onUpgrade?: (tier: SubscriptionTier) => Promise<void>
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

interface PlanConfig {
  tier: SubscriptionTier
  label: string
  icon: typeof Crown
  price: string
  period: string
  description: string
  features: string[]
  popular?: boolean
}

const PLANS: PlanConfig[] = [
  {
    tier: "free",
    label: "Free",
    icon: Zap,
    price: "€0",
    period: "forever",
    description: "Get started with basic features",
    features: [
      "1 active journey",
      "Basic legal knowledge base",
      "Standard calculators",
      "Community support",
    ],
  },
  {
    tier: "premium",
    label: "Premium",
    icon: Crown,
    price: "€19",
    period: "per month",
    description: "Everything you need for your property journey",
    features: [
      "Unlimited journeys",
      "Full legal knowledge base",
      "Advanced calculators",
      "50 document translation credits/mo",
      "Priority email support",
      "2 expert consultations/mo",
    ],
    popular: true,
  },
  {
    tier: "enterprise",
    label: "Enterprise",
    icon: Building2,
    price: "€99",
    period: "per month",
    description: "For agencies and professionals",
    features: [
      "Everything in Premium",
      "Team collaboration (up to 10)",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "99.9% SLA guarantee",
    ],
  },
]

/******************************************************************************
                              Components
******************************************************************************/

/** Single plan card. */
function PlanCard(props: {
  plan: PlanConfig
  currentTier: SubscriptionTier
  isLoading: boolean
  onSelect: () => void
}) {
  const { plan, currentTier, isLoading, onSelect } = props
  const Icon = plan.icon

  const isCurrent = plan.tier === currentTier
  const isDowngrade =
    (currentTier === "enterprise" && plan.tier !== "enterprise") ||
    (currentTier === "premium" && plan.tier === "free")

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        plan.popular && "border-blue-600 border-2",
        isCurrent && "bg-muted/50",
      )}
    >
      {plan.popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">
          Most Popular
        </Badge>
      )}
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-5 w-5",
              plan.tier === "free" && "text-gray-600",
              plan.tier === "premium" && "text-blue-600",
              plan.tier === "enterprise" && "text-purple-600",
            )}
          />
          <CardTitle>{plan.label}</CardTitle>
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-4">
          <span className="text-3xl font-bold">{plan.price}</span>
          <span className="text-muted-foreground ml-1">/{plan.period}</span>
        </div>
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        ) : isDowngrade ? (
          <Button variant="outline" className="w-full" disabled>
            Contact Support to Downgrade
          </Button>
        ) : (
          <Button
            className={cn(
              "w-full",
              plan.popular && "bg-blue-600 hover:bg-blue-700",
            )}
            onClick={onSelect}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Upgrade to ${plan.label}`
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

/** Default component. Subscription upgrade with plan comparison. */
function SubscriptionUpgrade(props: IProps) {
  const { currentTier, onUpgrade, className } = props
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null)

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!onUpgrade) {
      // Placeholder: In production, this would redirect to Stripe checkout
      console.log(`Upgrade to ${tier} requested`)
      return
    }

    setLoadingTier(tier)
    try {
      await onUpgrade(tier)
    } finally {
      setLoadingTier(null)
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h3 className="text-lg font-semibold">Upgrade Your Plan</h3>
        <p className="text-sm text-muted-foreground">
          Choose the plan that best fits your needs
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.tier}
            plan={plan}
            currentTier={currentTier}
            isLoading={loadingTier === plan.tier}
            onSelect={() => handleUpgrade(plan.tier)}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        All plans include a 14-day money-back guarantee. Prices are in EUR and
        exclude VAT where applicable.
      </p>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { SubscriptionUpgrade }
