/**
 * Mortgage mini-preview
 * Compact landing-page preview of the mortgage calculator — a few fields
 * plus a live computed result, with a link to the full detailed page.
 */

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useMemo, useState } from "react"
import { calculateMortgage } from "@/components/Calculators/MortgageAmortisation/mortgageCalculations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CURRENCY_FORMATTER, PreviewMetric } from "./PreviewMetric"

/******************************************************************************
                              Constants
******************************************************************************/

const FIXED_RATE_OPTIONS = ["5", "10", "15", "20"]

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Mortgage tab preview. */
function MortgagePreview() {
  const [propertyPrice, setPropertyPrice] = useState("450000")
  const [downPaymentPercent, setDownPaymentPercent] = useState("20")
  const [interestRate, setInterestRate] = useState("3.8")
  const [fixedRatePeriod, setFixedRatePeriod] = useState("10")

  const price = Number.parseFloat(propertyPrice) || 0
  const percent = Number.parseFloat(downPaymentPercent) || 0
  const rate = Number.parseFloat(interestRate) || 0

  const result = useMemo(() => {
    if (price <= 0 || rate <= 0) return null
    return calculateMortgage({
      propertyPrice: price,
      downPaymentAmount: price * (percent / 100),
      downPaymentPercent: percent,
      interestRate: rate,
      initialRepaymentRate: 2,
      fixedRatePeriod: Number.parseInt(fixedRatePeriod, 10),
      specialRepaymentPercent: 0,
    })
  }, [price, percent, rate, fixedRatePeriod])

  return (
    <div className="flex flex-1 flex-col justify-between gap-6">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label
            htmlFor="mp-price"
            className="font-mono text-xs text-muted-foreground"
          >
            Property Price
          </Label>
          <Input
            id="mp-price"
            inputMode="numeric"
            className="h-11"
            value={propertyPrice}
            onChange={(e) =>
              setPropertyPrice(e.target.value.replace(/[^\d]/g, ""))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="mp-rate"
            className="font-mono text-xs text-muted-foreground"
          >
            Interest Rate %
          </Label>
          <Input
            id="mp-rate"
            inputMode="decimal"
            className="h-11"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="mp-down"
              className="font-mono text-xs text-muted-foreground"
            >
              Down Payment %
            </Label>
            <Input
              id="mp-down"
              inputMode="decimal"
              className="h-11"
              value={downPaymentPercent}
              onChange={(e) => setDownPaymentPercent(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="mp-fixed"
              className="font-mono text-xs text-muted-foreground"
            >
              Fixed-Rate Period
            </Label>
            <Select value={fixedRatePeriod} onValueChange={setFixedRatePeriod}>
              <SelectTrigger id="mp-fixed" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIXED_RATE_OPTIONS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y} years
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {result && (
          <div className="grid grid-cols-3 gap-2">
            <PreviewMetric
              label="Monthly Payment"
              value={CURRENCY_FORMATTER.format(result.monthlyPayment)}
            />
            <PreviewMetric
              label="Total Interest"
              value={CURRENCY_FORMATTER.format(result.totalInterestDuringFixed)}
            />
            <PreviewMetric
              label="LTV Ratio"
              value={`${result.ltvRatio.toFixed(0)}%`}
            />
          </div>
        )}
      </div>

      <Button className="w-full gap-2" variant="outline" asChild>
        <Link
          to="/tools/mortgage-calculator"
          search={{
            propertyPrice: price || undefined,
            downPaymentPercent: percent || undefined,
            interestRate: rate || undefined,
            fixedRatePeriod: Number.parseInt(fixedRatePeriod, 10) || undefined,
          }}
        >
          See Detailed Result
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MortgagePreview }
