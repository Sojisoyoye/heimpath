/**
 * Market Insights Component
 * Shows market data for the "Understand the German Property Market" step
 */

import {
  AlertCircle,
  BarChart3,
  Euro,
  Info,
  Loader2,
  MapPin,
  Minus,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"
import {
  GERMAN_STATES,
  MARKET_DATA_BY_STATE,
  PROPERTY_TYPE_MULTIPLIERS,
  PROPERTY_TYPES,
} from "@/common/constants"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { MarketInsightsData, PropertyGoals } from "@/models/journey"

interface IProps {
  propertyLocation?: string
  propertyType?: string
  budgetEuros?: number
  propertyGoals?: PropertyGoals
  marketInsights?: MarketInsightsData
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const TREND_ICONS = {
  rising: TrendingUp,
  stable: Minus,
  falling: TrendingDown,
}

const TREND_COLORS = {
  rising: "text-green-600",
  stable: "text-yellow-600",
  falling: "text-red-600",
}

const TREND_LABELS = {
  rising: "Prices Rising",
  stable: "Prices Stable",
  falling: "Prices Falling",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Stat card for displaying key metrics. */
function StatCard(props: {
  label: string
  value: string
  sublabel?: string
  icon: React.ComponentType<{ className?: string }>
  highlight?: boolean
}) {
  const { label, value, sublabel, icon: Icon, highlight } = props

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        highlight && "border-blue-300 bg-blue-50 dark:bg-blue-950/30",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sublabel && (
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          )}
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  )
}

/** Skeleton stat card shown while insights are generating. */
function StatCardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

/** Loading state shown while market insights are being generated. */
function GeneratingInsights(props: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", props.className)}>
      <CardHeader className="bg-green-50 dark:bg-green-950/30">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Market Insights
          <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
        </CardTitle>
        <CardDescription>Generating personalised insights…</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Skeleton className="h-6 w-6 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </CardContent>
    </Card>
  )
}

/** No goals warning. */
function NoGoalsWarning() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:bg-yellow-950/30">
      <AlertCircle className="h-5 w-5 text-yellow-600" />
      <div>
        <p className="font-medium text-yellow-800 dark:text-yellow-400">
          Complete Step 1 first
        </p>
        <p className="text-sm text-yellow-700 dark:text-yellow-500">
          Define your property goals to get personalized market insights.
        </p>
      </div>
    </div>
  )
}

/** Default component. Market insights for Step 2. */
function MarketInsights(props: IProps) {
  const {
    propertyLocation,
    propertyType,
    budgetEuros,
    propertyGoals,
    marketInsights,
    className,
  } = props

  // Show loading skeleton when Step 1 is done but insights haven't arrived yet
  const isGenerating = propertyGoals?.is_completed && !marketInsights
  if (isGenerating) {
    return <GeneratingInsights className={className} />
  }

  // Get state info
  const stateInfo = GERMAN_STATES.find((s) => s.code === propertyLocation)
  const marketData = propertyLocation
    ? MARKET_DATA_BY_STATE[propertyLocation]
    : null

  // Use property goals preferred type if available, otherwise fall back to journey property type
  const effectivePropertyType =
    propertyGoals?.preferred_property_type || propertyType || "apartment"
  const propertyTypeLabel =
    PROPERTY_TYPES.find((t) => t.value === effectivePropertyType)?.label.split(
      " ",
    )[0] || "Property"

  // Use backend-computed prices when available, fall back to local computation
  const adjustedAvgPrice =
    marketInsights?.adjusted_avg_price_per_sqm ??
    (marketData
      ? Math.round(
          marketData.avgPricePerSqm *
            (PROPERTY_TYPE_MULTIPLIERS[effectivePropertyType] || 1),
        )
      : 0)
  const adjustedMinPrice =
    marketInsights?.adjusted_min_price_per_sqm ??
    (marketData
      ? Math.round(
          marketData.priceRange.min *
            (PROPERTY_TYPE_MULTIPLIERS[effectivePropertyType] || 1),
        )
      : 0)
  const adjustedMaxPrice =
    marketInsights?.adjusted_max_price_per_sqm ??
    (marketData
      ? Math.round(
          marketData.priceRange.max *
            (PROPERTY_TYPE_MULTIPLIERS[effectivePropertyType] || 1),
        )
      : 0)

  // Calculate estimated size based on budget (prefer backend value)
  const estimatedSqm =
    marketInsights?.estimated_size_sqm ??
    (budgetEuros && adjustedAvgPrice > 0
      ? Math.round(budgetEuros / adjustedAvgPrice)
      : 0)

  // Check if property goals are set
  const hasGoals = propertyGoals?.is_completed

  if (!stateInfo || !marketData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Market Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Select a property location to see market insights.
          </p>
        </CardContent>
      </Card>
    )
  }

  const TrendIcon = TREND_ICONS[marketData.trend]

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-green-50 dark:bg-green-950/30">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Market Insights: {stateInfo.name}
        </CardTitle>
        <CardDescription>
          Based on your property goals
          {hasGoals ? "" : " (complete Step 1 for personalized data)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {!hasGoals && <NoGoalsWarning />}

        {/* Market Trend */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <TrendIcon
              className={cn("h-6 w-6", TREND_COLORS[marketData.trend])}
            />
            <div>
              <p className="font-medium">{TREND_LABELS[marketData.trend]}</p>
              <p className="text-sm text-muted-foreground">
                Current market trend in {stateInfo.name}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              marketData.trend === "rising" &&
                "border-green-300 bg-green-50 text-green-700",
              marketData.trend === "stable" &&
                "border-yellow-300 bg-yellow-50 text-yellow-700",
              marketData.trend === "falling" &&
                "border-red-300 bg-red-50 text-red-700",
            )}
          >
            {marketData.trend.charAt(0).toUpperCase() +
              marketData.trend.slice(1)}
          </Badge>
        </div>

        {/* Key Stats Grid */}
        {(() => {
          const agentFee =
            marketInsights?.agent_fee_percent ?? marketData.agentFeePercent
          const transferTax =
            marketInsights?.transfer_tax_rate ?? stateInfo.transferTaxRate
          return (
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Average Price per m²"
                value={CURRENCY_FORMATTER.format(adjustedAvgPrice)}
                sublabel={`For ${propertyTypeLabel.toLowerCase()}s`}
                icon={Euro}
                highlight
              />
              <StatCard
                label="Price Range"
                value={`${CURRENCY_FORMATTER.format(adjustedMinPrice)} - ${CURRENCY_FORMATTER.format(adjustedMaxPrice)}`}
                sublabel="Per m²"
                icon={BarChart3}
              />
              <StatCard
                label="Agent Fee (Makler)"
                value={`${agentFee}%`}
                sublabel="Buyer's share after Bestellerprinzip"
                icon={Users}
              />
              <StatCard
                label="Transfer Tax"
                value={`${transferTax}%`}
                sublabel="Grunderwerbsteuer"
                icon={Euro}
              />
            </div>
          )
        })()}

        {/* Budget Analysis */}
        {budgetEuros && budgetEuros > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Based on Your Budget
              </h4>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                {(() => {
                  const agentFee =
                    marketInsights?.agent_fee_percent ??
                    marketData.agentFeePercent
                  const transferTax =
                    marketInsights?.transfer_tax_rate ??
                    stateInfo.transferTaxRate
                  const additionalCostPct = agentFee + transferTax + 2
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Your Budget
                        </span>
                        <span className="font-medium">
                          {CURRENCY_FORMATTER.format(budgetEuros)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Estimated Property Size
                        </span>
                        <span className="font-medium">{estimatedSqm} m²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Total Additional Costs (~
                          {additionalCostPct.toFixed(1)}%)
                        </span>
                        <span className="font-medium">
                          {CURRENCY_FORMATTER.format(
                            (budgetEuros * additionalCostPct) / 100,
                          )}
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          </>
        )}

        {/* Property Goals Summary */}
        {hasGoals && propertyGoals && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium">Your Property Requirements</h4>
              <div className="flex flex-wrap gap-2">
                {propertyGoals.min_rooms && (
                  <Badge variant="secondary">
                    {propertyGoals.min_rooms}+ Rooms
                  </Badge>
                )}
                {propertyGoals.min_bathrooms && (
                  <Badge variant="secondary">
                    {propertyGoals.min_bathrooms}+ Bathrooms
                  </Badge>
                )}
                {propertyGoals.preferred_floor && (
                  <Badge variant="secondary">
                    {propertyGoals.preferred_floor.charAt(0).toUpperCase() +
                      propertyGoals.preferred_floor.slice(1)}{" "}
                    Floor
                  </Badge>
                )}
                {propertyGoals.has_elevator_required && (
                  <Badge variant="secondary">Elevator Required</Badge>
                )}
                {propertyGoals.features?.map((feature) => (
                  <Badge key={feature} variant="outline">
                    {feature
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Hotspots */}
        <Separator />
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Popular Areas in {stateInfo.name}
          </h4>
          <div className="flex flex-wrap gap-2">
            {marketData.hotspots.map((hotspot) => (
              <Badge key={hotspot} variant="outline">
                {hotspot}
              </Badge>
            ))}
          </div>
        </div>

        {/* Tips */}
        {(() => {
          const effectiveTrend = marketInsights?.trend ?? marketData.trend
          return (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950/30">
              <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">
                Tips for {stateInfo.name}
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>
                  • Agent fees are typically split 50/50 between buyer and
                  seller
                </li>
                <li>
                  • Budget an additional 10-15% for transaction costs (notary,
                  taxes, etc.)
                </li>
                {effectiveTrend === "rising" && (
                  <li>• Market is competitive - be prepared to move quickly</li>
                )}
                {effectiveTrend === "stable" && (
                  <li>• Take your time to find the right property</li>
                )}
              </ul>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MarketInsights }
