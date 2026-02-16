/**
 * Property Information Section
 * Inputs for address, size, price, and transaction fees
 */

import { Home } from "lucide-react"
import { SECTION_COLORS } from "@/common/constants/propertyEvaluation"
import { cn } from "@/common/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PropertyInfoInputs } from "../types"

interface IProps {
  values: PropertyInfoInputs
  onChange: (updates: Partial<PropertyInfoInputs>) => void
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

/******************************************************************************
                              Components
******************************************************************************/

/** Format number with thousand separators. */
function formatNumber(value: number): string {
  if (value === 0) return ""
  return value.toLocaleString("de-DE")
}

/** Parse number from formatted string. */
function parseNumber(value: string): number {
  const cleaned = value.replace(/[^\d]/g, "")
  return cleaned ? parseInt(cleaned, 10) : 0
}

/** Default component. Property information section. */
function PropertyInfoSection(props: IProps) {
  const { values, onChange, className } = props

  const handleNumberChange = (
    field: keyof PropertyInfoInputs,
    value: string,
  ) => {
    onChange({ [field]: parseNumber(value) })
  }

  const handlePercentChange = (
    field: keyof PropertyInfoInputs,
    value: string,
  ) => {
    const num = parseFloat(value) || 0
    onChange({ [field]: num })
  }

  const pricePerSqm =
    values.squareMeters > 0 ? values.purchasePrice / values.squareMeters : 0

  const totalIncidentalPercent =
    values.brokerFeePercent +
    values.notaryFeePercent +
    values.landRegistryFeePercent +
    values.transferTaxPercent

  const totalIncidentalCosts =
    values.purchasePrice * (totalIncidentalPercent / 100)

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("py-3", SECTION_COLORS.propertyInfo)}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Home className="h-4 w-4" />
          Property Information
        </CardTitle>
        <p className="text-xs font-normal opacity-80 mt-1">
          Retrieve from Expose
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            type="text"
            placeholder="Enter property address"
            value={values.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </div>

        {/* Size and Price */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="squareMeters">Living Space (m²)</Label>
            <Input
              id="squareMeters"
              type="number"
              step="0.1"
              min="0"
              placeholder="e.g., 25.7"
              value={values.squareMeters || ""}
              onChange={(e) =>
                handlePercentChange("squareMeters", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price (EUR)</Label>
            <Input
              id="purchasePrice"
              type="text"
              inputMode="numeric"
              placeholder="e.g., 240,000"
              value={formatNumber(values.purchasePrice)}
              onChange={(e) =>
                handleNumberChange("purchasePrice", e.target.value)
              }
            />
          </div>
        </div>

        {/* Price per sqm display */}
        {pricePerSqm > 0 && (
          <div className="rounded-md bg-muted/50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price per m²</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(pricePerSqm)}
              </span>
            </div>
          </div>
        )}

        {/* Transaction Fees */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            Transaction Costs
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brokerFee">Broker Fee (%)</Label>
              <Input
                id="brokerFee"
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={values.brokerFeePercent || ""}
                onChange={(e) =>
                  handlePercentChange("brokerFeePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notaryFee">Notary Fee (%)</Label>
              <Input
                id="notaryFee"
                type="number"
                step="0.01"
                min="0"
                max="5"
                value={values.notaryFeePercent || ""}
                onChange={(e) =>
                  handlePercentChange("notaryFeePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landRegistryFee">Land Registry Fee (%)</Label>
              <Input
                id="landRegistryFee"
                type="number"
                step="0.01"
                min="0"
                max="2"
                value={values.landRegistryFeePercent || ""}
                onChange={(e) =>
                  handlePercentChange("landRegistryFeePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferTax">Transfer Tax (%)</Label>
              <Input
                id="transferTax"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={values.transferTaxPercent || ""}
                onChange={(e) =>
                  handlePercentChange("transferTaxPercent", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* Total incidental costs display */}
        {values.purchasePrice > 0 && (
          <div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-950/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Total Incidental Costs ({totalIncidentalPercent.toFixed(2)}%)
              </span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(totalIncidentalCosts)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyInfoSection }
