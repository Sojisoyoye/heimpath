/**
 * Mietpreisbremse Rent Ceiling Calculator
 * Checks whether the current rent exceeds the legal cap (Mietspiegel × 1.10)
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
import { FormRow } from "./common/FormRow"
import { MetricCard } from "./common/MetricCard"

/******************************************************************************
                              Types
******************************************************************************/

interface IProps {
  className?: string
}

interface FormInputs {
  city: RentCeilingCity
  postcode: string
  sizeSqm: string
  buildingYear: string
  currentRent: string
}

/******************************************************************************
                              Constants
******************************************************************************/

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

const DEFAULT_INPUTS: FormInputs = {
  city: "berlin",
  postcode: "",
  sizeSqm: "",
  buildingYear: "",
  currentRent: "",
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Mietpreisbremse rent ceiling calculator. */
function RentCeilingCalculator(props: Readonly<IProps>) {
  const { className } = props
  const [inputs, setInputs] = useState<FormInputs>(DEFAULT_INPUTS)
  const check = useCheckRentCeiling()
  const { showErrorToast } = useCustomToast()

  const allFilled =
    inputs.postcode.length === 5 &&
    inputs.sizeSqm.length > 0 &&
    inputs.currentRent.length > 0

  function handleChange(field: keyof FormInputs, value: string) {
    setInputs((prev) => ({ ...prev, [field]: value }))
  }

  function handleCheck() {
    check.mutate(
      {
        city: inputs.city,
        postcode: inputs.postcode,
        sizeSqm: Number(inputs.sizeSqm),
        currentRent: Number(inputs.currentRent),
        ...(inputs.buildingYear
          ? { buildingYear: Number(inputs.buildingYear) }
          : {}),
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
    <div className={cn("space-y-6", className)}>
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle>Mietpreisbremse Rent Check</CardTitle>
          <CardDescription>
            Check whether your current rent exceeds the legal cap
            (Mietspiegel&nbsp;×&nbsp;1.10) under §556d BGB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Select
              value={inputs.city}
              onValueChange={(v) => handleChange("city", v)}
            >
              <SelectTrigger id="city">
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

          {/* Postcode */}
          <FormRow label="Postcode" htmlFor="postcode" required>
            <Input
              id="postcode"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 10115"
              value={inputs.postcode}
              onChange={(e) => handleChange("postcode", e.target.value)}
            />
          </FormRow>

          {/* Size */}
          <FormRow label="Apartment size (m²)" htmlFor="sizeSqm" required>
            <Input
              id="sizeSqm"
              type="number"
              min="1"
              max="1000"
              placeholder="e.g. 65"
              value={inputs.sizeSqm}
              onChange={(e) => handleChange("sizeSqm", e.target.value)}
            />
          </FormRow>

          {/* Building year (optional) */}
          <FormRow
            label="Building year (optional)"
            htmlFor="buildingYear"
            tooltip="Construction year — accepted for future Mietspiegel adjustments"
          >
            <Input
              id="buildingYear"
              type="number"
              min="1800"
              max="2030"
              placeholder="e.g. 1990"
              value={inputs.buildingYear}
              onChange={(e) => handleChange("buildingYear", e.target.value)}
            />
          </FormRow>

          {/* Current rent */}
          <FormRow
            label="Current monthly rent (EUR)"
            htmlFor="currentRent"
            required
          >
            <Input
              id="currentRent"
              type="number"
              min="1"
              placeholder="e.g. 1200"
              value={inputs.currentRent}
              onChange={(e) => handleChange("currentRent", e.target.value)}
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
            {/* Legal warning for OVER_LIMIT */}
            {result.status === "OVER_LIMIT" && (
              <Alert variant="destructive">
                <AlertOctagon className="h-4 w-4" />
                <AlertDescription>
                  You may be liable for up to 2 years of overpaid rent — consult
                  a Steuerberater immediately.
                </AlertDescription>
              </Alert>
            )}

            {/* Key metrics */}
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

/******************************************************************************
                              Export
******************************************************************************/

export { RentCeilingCalculator }
export default RentCeilingCalculator
