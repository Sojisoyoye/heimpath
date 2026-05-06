/**
 * Mortgage Amortisation Form
 * Input form for German annuity mortgage calculation
 */

import { Calculator, ChevronDown, RefreshCw } from "lucide-react"
import { useState } from "react"
import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { MortgageInput } from "@/models/mortgageAmortisation"
import { FormRow } from "../common/FormRow"
import { syncDownPayment } from "./mortgageCalculations"

interface IProps {
  onCalculate: (inputs: MortgageInput) => void
}

/******************************************************************************
                              Constants
******************************************************************************/

const INITIAL_STATE = {
  propertyPrice: "",
  downPaymentAmount: "",
  downPaymentPercent: "20",
  downPaymentMode: "percent" as "amount" | "percent",
  interestRate: "3.5",
  initialRepaymentRate: "2",
  fixedRatePeriod: "10",
  specialRepaymentPercent: "0",
}

const FIXED_RATE_OPTIONS = ["5", "10", "15", "20"]

/******************************************************************************
                              Functions
******************************************************************************/

function parseNum(v: string): number {
  return Number.parseFloat(v.replace(/[^\d.]/g, "")) || 0
}

function formatPrice(v: string): string {
  if (!v) return ""
  const num = Number.parseInt(v, 10)
  return Number.isNaN(num) ? "" : num.toLocaleString("de-DE")
}

/******************************************************************************
                              Components
******************************************************************************/

function MortgageAmortisationForm(props: Readonly<IProps>) {
  const { onCalculate } = props
  const [fields, setFields] = useState(INITIAL_STATE)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const update = (key: keyof typeof fields, v: string) =>
    setFields((prev) => ({ ...prev, [key]: v }))

  const handlePropertyPriceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = e.target.value.replace(/[^\d]/g, "")
    const price = parseNum(raw)
    const synced =
      fields.downPaymentMode === "percent"
        ? syncDownPayment(price, undefined, parseNum(fields.downPaymentPercent))
        : syncDownPayment(price, parseNum(fields.downPaymentAmount))

    setFields((prev) => ({
      ...prev,
      propertyPrice: raw,
      downPaymentAmount:
        synced.amount > 0 ? String(Math.round(synced.amount)) : "",
      downPaymentPercent:
        synced.percent > 0 ? String(Math.round(synced.percent * 10) / 10) : "",
    }))
  }

  const handleDownPaymentAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = e.target.value.replace(/[^\d]/g, "")
    const synced = syncDownPayment(
      parseNum(fields.propertyPrice),
      parseNum(raw),
    )
    setFields((prev) => ({
      ...prev,
      downPaymentAmount: raw,
      downPaymentPercent:
        synced.percent > 0 ? String(Math.round(synced.percent * 10) / 10) : "",
      downPaymentMode: "amount",
    }))
  }

  const handleDownPaymentPercentChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = e.target.value
    const synced = syncDownPayment(
      parseNum(fields.propertyPrice),
      undefined,
      parseNum(raw),
    )
    setFields((prev) => ({
      ...prev,
      downPaymentPercent: raw,
      downPaymentAmount:
        synced.amount > 0 ? String(Math.round(synced.amount)) : "",
      downPaymentMode: "percent",
    }))
  }

  const errors = {
    propertyPrice: parseNum(fields.propertyPrice) <= 0,
    interestRate: parseNum(fields.interestRate) <= 0,
    repaymentRate: parseNum(fields.initialRepaymentRate) <= 0,
  }

  const isValid = !Object.values(errors).some(Boolean)

  const handleSubmit = () => {
    if (!isValid) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    const price = parseNum(fields.propertyPrice)
    const input: MortgageInput = {
      propertyPrice: price,
      downPaymentAmount: parseNum(fields.downPaymentAmount),
      downPaymentPercent: parseNum(fields.downPaymentPercent),
      interestRate: parseNum(fields.interestRate),
      initialRepaymentRate: parseNum(fields.initialRepaymentRate),
      fixedRatePeriod: Number.parseInt(fields.fixedRatePeriod, 10),
      specialRepaymentPercent: parseNum(fields.specialRepaymentPercent),
    }
    onCalculate(input)
  }

  const handleReset = () => {
    setFields(INITIAL_STATE)
    setShowErrors(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Mortgage Calculator
        </CardTitle>
        <CardDescription>
          Calculate your monthly payments and amortisation schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Property & Down Payment */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            Loan Details
          </h4>
          <FormRow
            htmlFor="propertyPrice"
            label="Property Price"
            error={
              showErrors && errors.propertyPrice
                ? "Enter a property price"
                : undefined
            }
          >
            <Input
              id="propertyPrice"
              type="text"
              inputMode="numeric"
              placeholder="400.000"
              value={formatPrice(fields.propertyPrice)}
              onChange={handlePropertyPriceChange}
              className={cn(
                showErrors && errors.propertyPrice && "border-destructive",
              )}
            />
          </FormRow>
          <FormRow
            htmlFor="downPayment"
            label="Down Payment"
            tooltip="Your equity contribution (Eigenkapital) — enter 0 for 100% financing"
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="downPayment"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatPrice(fields.downPaymentAmount)}
                  onChange={handleDownPaymentAmountChange}
                />
              </div>
              <div className="w-20">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={fields.downPaymentPercent}
                  onChange={handleDownPaymentPercentChange}
                  className="text-center"
                  aria-label="Down payment percent"
                />
              </div>
              <span className="flex items-center text-sm text-muted-foreground">
                %
              </span>
            </div>
          </FormRow>
        </div>

        {/* Interest & Repayment */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            Interest & Repayment
          </h4>
          <FormRow
            htmlFor="interestRate"
            label="Interest Rate (Sollzins)"
            tooltip="Annual nominal interest rate from your bank offer"
            error={
              showErrors && errors.interestRate
                ? "Enter an interest rate"
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              <Input
                id="interestRate"
                type="number"
                min="0"
                max="15"
                step="0.1"
                value={fields.interestRate}
                onChange={(e) => update("interestRate", e.target.value)}
                className={cn(
                  showErrors && errors.interestRate && "border-destructive",
                )}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </FormRow>
          <FormRow
            htmlFor="initialRepaymentRate"
            label="Initial Repayment (Anfangstilgung)"
            tooltip="Starting annual repayment rate — higher means faster payoff"
            error={
              showErrors && errors.repaymentRate
                ? "Enter a repayment rate"
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              <Input
                id="initialRepaymentRate"
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={fields.initialRepaymentRate}
                onChange={(e) => update("initialRepaymentRate", e.target.value)}
                className={cn(
                  showErrors && errors.repaymentRate && "border-destructive",
                )}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </FormRow>
          <FormRow
            htmlFor="fixedRatePeriod"
            label="Fixed Rate Period (Zinsbindung)"
            tooltip="Years the interest rate is locked — you'll need Anschlussfinanzierung after"
          >
            <Select
              value={fields.fixedRatePeriod}
              onValueChange={(v) => update("fixedRatePeriod", v)}
            >
              <SelectTrigger id="fixedRatePeriod">
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
          </FormRow>
        </div>

        {/* Advanced (collapsible) */}
        <div className="space-y-4">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowAdvanced((p) => !p)}
          >
            <span>Advanced Settings</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                showAdvanced && "rotate-180",
              )}
            />
          </button>
          {showAdvanced && (
            <div className="space-y-4 rounded-lg border border-dashed p-4">
              <FormRow
                htmlFor="specialRepaymentPercent"
                label="Special Repayment (Sondertilgung)"
                tooltip="Annual extra repayment as % of initial loan — typically 5% allowed"
              >
                <div className="flex items-center gap-2">
                  <Input
                    id="specialRepaymentPercent"
                    type="number"
                    min="0"
                    max="10"
                    step="1"
                    value={fields.specialRepaymentPercent}
                    onChange={(e) =>
                      update("specialRepaymentPercent", e.target.value)
                    }
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </FormRow>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSubmit} className="gap-2">
            <Calculator className="h-4 w-4" />
            Calculate
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MortgageAmortisationForm }
