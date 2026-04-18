/**
 * Ownership Comparison Form
 * Input form with basic fields and collapsible advanced section
 */

import { Calculator, ChevronDown, RefreshCw, Scale } from "lucide-react"
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
import type { OwnershipComparisonInput } from "@/models/ownershipComparison"
import { FormRow } from "../common/FormRow"

interface IProps {
  onCalculate: (inputs: OwnershipComparisonInput) => void
  isCalculating: boolean
}

/******************************************************************************
                              Constants
******************************************************************************/

const INITIAL_STATE = {
  numProperties: "3",
  annualRentalIncome: "",
  personalMarginalTaxRate: "42",
  annualAppreciation: "3",
  holdingPeriod: "15",
  totalPropertyValue: "",
  buildingSharePercent: "70",
  afaRatePercent: "2",
  annualRentIncreasePercent: "2",
  gewerbesteuerHebesatz: "400",
  gmbhSetupCost: "3500",
  annualAccountingCost: "4000",
}

/******************************************************************************
                              Functions
******************************************************************************/

function parseNum(v: string): number {
  return Number.parseFloat(v.replace(/[^\d.]/g, "")) || 0
}

/******************************************************************************
                              Components
******************************************************************************/

function OwnershipComparisonForm(props: IProps) {
  const { onCalculate, isCalculating } = props
  const [fields, setFields] = useState(INITIAL_STATE)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const update = (key: keyof typeof fields, v: string) =>
    setFields((prev) => ({ ...prev, [key]: v }))

  const handlePriceInput = (
    key: keyof typeof fields,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value.replace(/[^\d]/g, "")
    update(key, value)
  }

  const handleSubmit = () => {
    const input: OwnershipComparisonInput = {
      numProperties: Math.max(1, Math.round(parseNum(fields.numProperties))),
      annualRentalIncome: parseNum(fields.annualRentalIncome),
      personalMarginalTaxRate: parseNum(fields.personalMarginalTaxRate),
      annualAppreciation: parseNum(fields.annualAppreciation),
      holdingPeriod: Math.max(1, Math.round(parseNum(fields.holdingPeriod))),
      totalPropertyValue: parseNum(fields.totalPropertyValue),
      buildingSharePercent: parseNum(fields.buildingSharePercent),
      afaRatePercent: parseNum(fields.afaRatePercent),
      annualRentIncreasePercent: parseNum(fields.annualRentIncreasePercent),
      gewerbesteuerHebesatz: parseNum(fields.gewerbesteuerHebesatz),
      gmbhSetupCost: parseNum(fields.gmbhSetupCost),
      annualAccountingCost: parseNum(fields.annualAccountingCost),
    }
    onCalculate(input)
  }

  const handleReset = () => setFields(INITIAL_STATE)

  const isValid =
    parseNum(fields.annualRentalIncome) > 0 &&
    parseNum(fields.totalPropertyValue) > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          GmbH vs. Private Ownership
        </CardTitle>
        <CardDescription>
          Compare tax efficiency of holding property via a GmbH or privately
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Core inputs */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            Property Details
          </h4>
          <FormRow htmlFor="numProperties" label="Number of Properties">
            <Input
              id="numProperties"
              type="number"
              min="1"
              max="50"
              value={fields.numProperties}
              onChange={(e) => update("numProperties", e.target.value)}
            />
          </FormRow>
          <FormRow htmlFor="totalPropertyValue" label="Total Property Value">
            <Input
              id="totalPropertyValue"
              type="text"
              inputMode="numeric"
              placeholder="1,000,000"
              value={
                fields.totalPropertyValue
                  ? Number.parseInt(
                      fields.totalPropertyValue,
                      10,
                    ).toLocaleString("de-DE")
                  : ""
              }
              onChange={(e) => handlePriceInput("totalPropertyValue", e)}
            />
          </FormRow>
          <FormRow htmlFor="annualRentalIncome" label="Annual Rental Income">
            <Input
              id="annualRentalIncome"
              type="text"
              inputMode="numeric"
              placeholder="60,000"
              value={
                fields.annualRentalIncome
                  ? Number.parseInt(
                      fields.annualRentalIncome,
                      10,
                    ).toLocaleString("de-DE")
                  : ""
              }
              onChange={(e) => handlePriceInput("annualRentalIncome", e)}
            />
          </FormRow>
        </div>

        {/* Investor profile */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            Investor Profile
          </h4>
          <FormRow
            htmlFor="personalMarginalTaxRate"
            label="Marginal Tax Rate (%)"
            tooltip="Your personal income tax bracket (up to 45%)"
          >
            <Input
              id="personalMarginalTaxRate"
              type="number"
              min="0"
              max="45"
              step="1"
              value={fields.personalMarginalTaxRate}
              onChange={(e) =>
                update("personalMarginalTaxRate", e.target.value)
              }
            />
          </FormRow>
          <FormRow
            htmlFor="holdingPeriod"
            label="Holding Period (years)"
            tooltip="Private is tax-free on capital gains after 10 years"
          >
            <Input
              id="holdingPeriod"
              type="number"
              min="1"
              max="30"
              value={fields.holdingPeriod}
              onChange={(e) => update("holdingPeriod", e.target.value)}
            />
          </FormRow>
          <FormRow htmlFor="annualAppreciation" label="Annual Appreciation (%)">
            <Input
              id="annualAppreciation"
              type="number"
              min="0"
              max="30"
              step="0.5"
              value={fields.annualAppreciation}
              onChange={(e) => update("annualAppreciation", e.target.value)}
            />
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
                htmlFor="buildingSharePercent"
                label="Building Share (%)"
                tooltip="Portion of property value attributable to the building (for depreciation)"
              >
                <Input
                  id="buildingSharePercent"
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={fields.buildingSharePercent}
                  onChange={(e) =>
                    update("buildingSharePercent", e.target.value)
                  }
                />
              </FormRow>
              <FormRow
                htmlFor="afaRatePercent"
                label="Depreciation Rate (%)"
                tooltip="Annual depreciation rate (AfA) — typically 2% for residential"
              >
                <Input
                  id="afaRatePercent"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={fields.afaRatePercent}
                  onChange={(e) => update("afaRatePercent", e.target.value)}
                />
              </FormRow>
              <FormRow
                htmlFor="annualRentIncreasePercent"
                label="Rent Increase (%/yr)"
              >
                <Input
                  id="annualRentIncreasePercent"
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={fields.annualRentIncreasePercent}
                  onChange={(e) =>
                    update("annualRentIncreasePercent", e.target.value)
                  }
                />
              </FormRow>
              <FormRow
                htmlFor="gewerbesteuerHebesatz"
                label="Gewerbesteuer Hebesatz (%)"
                tooltip="Municipal trade tax multiplier (e.g. 400 for Berlin)"
              >
                <Input
                  id="gewerbesteuerHebesatz"
                  type="number"
                  min="200"
                  max="900"
                  step="10"
                  value={fields.gewerbesteuerHebesatz}
                  onChange={(e) =>
                    update("gewerbesteuerHebesatz", e.target.value)
                  }
                />
              </FormRow>
              <FormRow htmlFor="gmbhSetupCost" label="GmbH Setup Cost">
                <Input
                  id="gmbhSetupCost"
                  type="number"
                  min="0"
                  step="500"
                  value={fields.gmbhSetupCost}
                  onChange={(e) => update("gmbhSetupCost", e.target.value)}
                />
              </FormRow>
              <FormRow
                htmlFor="annualAccountingCost"
                label="Annual Accounting Cost"
              >
                <Input
                  id="annualAccountingCost"
                  type="number"
                  min="0"
                  step="500"
                  value={fields.annualAccountingCost}
                  onChange={(e) =>
                    update("annualAccountingCost", e.target.value)
                  }
                />
              </FormRow>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isCalculating}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            {isCalculating ? "Calculating..." : "Calculate"}
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

export { OwnershipComparisonForm }
