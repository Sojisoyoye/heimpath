/**
 * Rent Estimate Calculator
 * Estimates market rent for any German postcode using Mietspiegel data.
 * Covers 9 major cities with high-confidence data and all 16 states with
 * medium-confidence state averages.
 */

import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  Building2,
  Euro,
  Info,
  Loader2,
  MapPin,
  TrendingUp,
} from "lucide-react"
import { useState } from "react"
import { GERMAN_STATES } from "@/common/constants"
import { cn } from "@/common/utils"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useRentEstimate } from "@/hooks/queries/useCalculatorQueries"
import { FormRow } from "./common/FormRow"

interface IProps {
  className?: string
}

// ***************************************************************************
//                              Constants
// ***************************************************************************

const CURRENCY_PER_SQM = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const CURRENCY_0 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const CONFIDENCE_CONFIG = {
  high: {
    label: "High confidence",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  medium: {
    label: "Medium confidence",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  low: {
    label: "Low confidence",
    className: "bg-muted text-muted-foreground",
  },
} as const

const STATE_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  GERMAN_STATES.map((s) => [s.code, s.name]),
)

// ***************************************************************************
//                              Components
// ***************************************************************************

/** Default component. Rent estimate calculator. */
function RentEstimate(props: Readonly<IProps>) {
  const { className } = props

  const [postcode, setPostcode] = useState("")
  const [sizeInput, setSizeInput] = useState("")
  const [yearInput, setYearInput] = useState("")

  const sizeSqm = parseFloat(sizeInput) || undefined
  const buildingYear = parseInt(yearInput, 10) || undefined
  const isValidPostcode = /^\d{5}$/.test(postcode)

  const { data: estimate, isFetching } = useRentEstimate(
    postcode,
    sizeSqm,
    buildingYear,
  )

  const stateName = estimate?.stateCode
    ? (STATE_NAME_BY_CODE[estimate.stateCode] ?? estimate.stateCode)
    : null

  const hasResult =
    estimate?.estimatedRentPerSqm != null && estimate.estimatedRentPerSqm > 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Rent Estimate (Mietspiegel)
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Estimate market rents for any German postcode. City-level data for 9
          major cities; state averages for all other postcodes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Property Details</CardTitle>
            <CardDescription>
              Enter a German postcode to get a rent estimate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormRow htmlFor="postcode" label="Postcode" required>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="postcode"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 80331"
                  maxLength={5}
                  value={postcode}
                  onChange={(e) =>
                    setPostcode(e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
                  className="pl-9"
                />
              </div>
              {postcode.length > 0 && !isValidPostcode && (
                <p className="mt-1 text-xs text-destructive">
                  Must be exactly 5 digits
                </p>
              )}
            </FormRow>

            <FormRow
              htmlFor="size"
              label="Size (m²)"
              optional
              tooltip="Property size used to calculate total monthly rent"
            >
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="size"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 65"
                  value={sizeInput}
                  onChange={(e) =>
                    setSizeInput(e.target.value.replace(/[^\d.]/g, ""))
                  }
                  className="pl-9"
                />
              </div>
            </FormRow>

            <FormRow
              htmlFor="year"
              label="Building year"
              optional
              tooltip="Construction year affects rent estimate via building-age adjustment"
            >
              <div className="relative">
                <TrendingUp className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="year"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1985"
                  maxLength={4}
                  value={yearInput}
                  onChange={(e) =>
                    setYearInput(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="pl-9"
                />
              </div>
            </FormRow>
          </CardContent>
        </Card>

        {/* Result card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Estimate
            </CardTitle>
            <CardDescription>
              Based on Mietspiegel data (2024 estimates)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {isFetching ? (
              <div className="flex h-full min-h-[120px] items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Looking up data…</span>
              </div>
            ) : !isValidPostcode ? (
              <div className="flex h-full min-h-[120px] items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  Enter a valid 5-digit postcode to see the rent estimate.
                </p>
              </div>
            ) : !hasResult ? (
              <div className="flex h-full min-h-[120px] items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">
                  No data found for postcode {postcode}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Primary KPI */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Estimated rent per m²
                  </p>
                  <p className="text-3xl font-bold tabular-nums">
                    {CURRENCY_PER_SQM.format(estimate.estimatedRentPerSqm!)}
                  </p>
                  {estimate.monthlyRent != null && sizeSqm && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      ≈{" "}
                      <span className="font-semibold text-foreground">
                        {CURRENCY_0.format(estimate.monthlyRent)} / month
                      </span>{" "}
                      for {sizeSqm} m²
                    </p>
                  )}
                </div>

                <Separator />

                {/* Range */}
                {estimate.rentRange && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Range min</p>
                      <p className="font-semibold">
                        {CURRENCY_PER_SQM.format(estimate.rentRange.min)}/m²
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Range max</p>
                      <p className="font-semibold">
                        {CURRENCY_PER_SQM.format(estimate.rentRange.max)}/m²
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Metadata */}
                <div className="space-y-2 text-sm">
                  {estimate.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">City:</span>
                      <span className="font-medium">{estimate.city}</span>
                    </div>
                  )}
                  {stateName && (
                    <div className="flex items-center gap-2">
                      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">State:</span>
                      <span className="font-medium">{stateName}</span>
                    </div>
                  )}
                  {estimate.source && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="font-medium">{estimate.source}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          CONFIDENCE_CONFIG[estimate.confidence].className,
                        )}
                      >
                        {CONFIDENCE_CONFIG[estimate.confidence].label}
                      </Badge>
                    </div>
                  )}
                </div>

                <Separator />

                {/* CTA: use in ROI calculator */}
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground mb-2">
                    Use this estimate to model your investment returns.
                  </p>
                  <Link
                    to="/calculators"
                    search={{ tab: "roi" }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Open ROI Calculator
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <Card className="border-dashed bg-muted/40">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium">Data note:</span> Estimates are based
            on Mietspiegel 2024 averages and state-level data. Actual rents vary
            by neighbourhood, furnishing, and condition. For investment
            decisions, always cross-check with current listings on Immoscout24
            or similar portals.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ***************************************************************************
//                              Export
// ***************************************************************************

export { RentEstimate }
export default RentEstimate
