/**
 * Rent Ceiling Section — Section 2 of Rent Analyser
 * Checks whether a rent exceeds the legal Mietpreisbremse cap (§556d BGB).
 * Postcode, size, and building year are shared from Section 1.
 */

import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/common/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Disclaimer } from "@/components/ui/disclaimer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCheckRentCeiling } from "@/hooks/mutations/useCalculatorMutations"
import useCustomToast from "@/hooks/useCustomToast"
import type { RentCeilingCity, RentCeilingStatus } from "@/models/calculator"
import { FormRow } from "../common/FormRow"
import { MetricCard } from "../common/MetricCard"

// ***************************************************************************
//                              Types
// ***************************************************************************

interface IProps {
  postcode: string
  onPostcodeChange: (v: string) => void
  sizeSqm: string
  onSizeSqmChange: (v: string) => void
  buildingYear: string
  onBuildingYearChange: (v: string) => void
}

// ***************************************************************************
//                              Constants
// ***************************************************************************

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const CITIES: { value: RentCeilingCity; label: string }[] = [
  { value: "berlin", label: "Berlin" },
  { value: "hamburg", label: "Hamburg" },
  { value: "munich", label: "Munich" },
  { value: "frankfurt", label: "Frankfurt" },
]

const STATUS_CONFIG: Record<
  RentCeilingStatus,
  {
    label: string
    color: string
    Icon: typeof AlertOctagon
  }
> = {
  OVER_LIMIT: {
    label: "Over Legal Limit",
    color:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30",
    Icon: AlertOctagon,
  },
  AT_RISK: {
    label: "At Risk",
    color:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30",
    Icon: AlertTriangle,
  },
  WITHIN_LIMIT: {
    label: "Within Limit",
    color:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30",
    Icon: CheckCircle,
  },
  ROOM_TO_INCREASE: {
    label: "Room to Increase",
    color:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30",
    Icon: TrendingUp,
  },
}

// ***************************************************************************
//                              Main Component
// ***************************************************************************

function RentCeilingSection(props: Readonly<IProps>) {
  const {
    postcode,
    onPostcodeChange,
    sizeSqm,
    onSizeSqmChange,
    buildingYear,
    onBuildingYearChange,
  } = props

  const [city, setCity] = useState<RentCeilingCity>("berlin")
  const [currentRent, setCurrentRent] = useState("")

  const check = useCheckRentCeiling()
  const { showErrorToast } = useCustomToast()

  const allFilled =
    postcode.length === 5 && sizeSqm.length > 0 && currentRent.length > 0

  function handleCheck() {
    check.mutate(
      {
        city,
        postcode,
        sizeSqm: Number(sizeSqm),
        currentRent: Number(currentRent),
        ...(buildingYear ? { buildingYear: Number(buildingYear) } : {}),
      },
      {
        onError: () =>
          showErrorToast("Check failed — verify the postcode and city"),
      },
    )
  }

  const result = check.data
  const statusConfig = result ? STATUS_CONFIG[result.status] : null

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle>Mietpreisbremse (Rent Brake) Check</CardTitle>
          <CardDescription>
            Check whether a rent exceeds the legal cap (Mietspiegel rent
            index&nbsp;×&nbsp;1.10) under §556d BGB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="rc-city">City</Label>
            <Select
              value={city}
              onValueChange={(v) => setCity(v as RentCeilingCity)}
            >
              <SelectTrigger id="rc-city">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Postcode — shared with Section 1 */}
          <FormRow label="Postcode" htmlFor="rc-postcode" required>
            <Input
              id="rc-postcode"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 10115"
              value={postcode}
              onChange={(e) =>
                onPostcodeChange(e.target.value.replace(/\D/g, "").slice(0, 5))
              }
            />
          </FormRow>

          {/* Size — shared with Section 1 */}
          <FormRow label="Apartment size (m²)" htmlFor="rc-sizeSqm" required>
            <Input
              id="rc-sizeSqm"
              type="number"
              min="1"
              max="1000"
              placeholder="e.g. 65"
              value={sizeSqm}
              onChange={(e) => onSizeSqmChange(e.target.value)}
            />
          </FormRow>

          {/* Building year — shared with Section 1 */}
          <FormRow
            label="Building year (optional)"
            htmlFor="rc-buildingYear"
            tooltip="Construction year — accepted for future Mietspiegel adjustments"
          >
            <Input
              id="rc-buildingYear"
              type="number"
              min="1800"
              max="2030"
              placeholder="e.g. 1990"
              value={buildingYear}
              onChange={(e) => onBuildingYearChange(e.target.value)}
            />
          </FormRow>

          {/* Current rent — unique to Section 2 */}
          <FormRow
            label="Current monthly rent (EUR)"
            htmlFor="rc-currentRent"
            required
          >
            <Input
              id="rc-currentRent"
              type="number"
              min="1"
              placeholder="e.g. 1200"
              value={currentRent}
              onChange={(e) => setCurrentRent(e.target.value)}
            />
          </FormRow>

          <Button
            onClick={handleCheck}
            disabled={!allFilled || check.isPending}
            className="w-full"
          >
            {check.isPending ? "Checking..." : "Check Rent Ceiling"}
          </Button>
        </CardContent>
      </Card>

      {/* Result Card */}
      {result && statusConfig && (
        <Card className={cn("border-2", statusConfig.color)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <statusConfig.Icon className="h-5 w-5" />
              {statusConfig.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.status === "OVER_LIMIT" && (
              <Alert variant="destructive">
                <AlertOctagon className="h-4 w-4" />
                <AlertDescription>
                  You may be liable for up to 2 years of overpaid rent — consult
                  a Steuerberater immediately.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Your Rent"
                value={EUR.format(result.currentRent)}
              />
              <MetricCard
                label="Legal Ceiling"
                value={EUR.format(result.ceilingRent)}
              />
              <MetricCard
                label="Reference Rent (Mietspiegel)"
                value={`${result.referenceRentPerSqm.toFixed(2)} €/m²`}
              />
              <MetricCard
                label="Apartment Size"
                value={`${result.sizeSqm} m²`}
              />
            </div>

            {result.status === "OVER_LIMIT" && (
              <MetricCard
                label="Overpayment"
                value={EUR.format(result.overpaymentEur)}
                description="Amount charged above the legal ceiling"
                variant="danger"
              />
            )}

            {result.status === "ROOM_TO_INCREASE" && (
              <MetricCard
                label="Could Increase By"
                value={EUR.format(result.roomToIncreaseEur)}
                description="Remaining headroom before reaching the ceiling"
                variant="success"
              />
            )}

            <Disclaimer className="mt-3">
              <p>Source: {result.dataSource}</p>
              <p className="mt-1">{result.disclaimer}</p>
            </Disclaimer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ***************************************************************************
//                              Export
// ***************************************************************************

export { RentCeilingSection }
