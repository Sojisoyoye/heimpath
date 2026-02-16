/**
 * Operating Costs Section
 * Inputs for allocable and non-allocable property management costs
 */

import { Receipt } from "lucide-react"
import { SECTION_COLORS } from "@/common/constants/propertyEvaluation"
import { cn } from "@/common/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { OperatingCostsInputs } from "../types"

interface IProps {
  values: OperatingCostsInputs
  coldRentMonthly: number
  onChange: (updates: Partial<OperatingCostsInputs>) => void
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
})

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Operating costs section. */
function OperatingCostsSection(props: IProps) {
  const { values, coldRentMonthly, onChange, className } = props

  const handleNumberChange = (
    field: keyof OperatingCostsInputs,
    value: string,
  ) => {
    const num = parseFloat(value) || 0
    onChange({ [field]: num })
  }

  // Derive display values
  const totalAllocable = values.hausgeldAllocable + values.propertyTaxMonthly
  const totalNonAllocable = values.hausgeldNonAllocable + values.reservesPortion
  const overallHausgeld = totalAllocable + totalNonAllocable
  const nonAllocablePercentOfRent =
    coldRentMonthly > 0 ? (totalNonAllocable / coldRentMonthly) * 100 : 0

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("py-3", SECTION_COLORS.operatingCosts)}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" />
          Operating Costs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Monthly Management Costs summary */}
        <p className="text-sm font-medium text-muted-foreground">
          Monthly Management Costs
        </p>
        <div className="rounded-md bg-orange-50 p-3 space-y-2 dark:bg-orange-950/30">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Allocable Costs</span>
            <span className="font-medium">
              {CURRENCY_FORMATTER.format(totalAllocable)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Non-allocable Costs</span>
            <span className="font-medium">
              {CURRENCY_FORMATTER.format(totalNonAllocable)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Corresponds to % of net cold rent
            </span>
            <span className="font-medium">
              {nonAllocablePercentOfRent.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2 mt-2">
            <span className="text-muted-foreground">
              Overall Mgmt. Costs (Hausgeld)
            </span>
            <span className="font-medium text-orange-600 dark:text-orange-400">
              {CURRENCY_FORMATTER.format(overallHausgeld)}
            </span>
          </div>
        </div>

        {/* Allocable and Non-Allocable Costs inputs */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            Allocable and Non-Allocable Costs (retrieve from Abrechnung)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hausgeldAllocable">
                House Allowance - Allocable (EUR/month)
              </Label>
              <Input
                id="hausgeldAllocable"
                type="number"
                step="10"
                min="0"
                placeholder="e.g., 116"
                value={values.hausgeldAllocable || ""}
                onChange={(e) =>
                  handleNumberChange("hausgeldAllocable", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Allocable portion passed to tenant
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyTaxMonthly">
                Property Tax (EUR/month)
              </Label>
              <Input
                id="propertyTaxMonthly"
                type="number"
                step="1"
                min="0"
                placeholder="e.g., 7"
                value={values.propertyTaxMonthly || ""}
                onChange={(e) =>
                  handleNumberChange("propertyTaxMonthly", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Grundsteuer - allocable to tenant
              </p>
            </div>
          </div>

          {/* Computed total allocable */}
          <div className="rounded-md bg-muted/50 p-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Total Allocable Costs</span>
              <span>{CURRENCY_FORMATTER.format(totalAllocable)}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hausgeldNonAllocable">
                House Allowance - Non-allocable (EUR/month)
              </Label>
              <Input
                id="hausgeldNonAllocable"
                type="number"
                step="10"
                min="0"
                placeholder="e.g., 23"
                value={values.hausgeldNonAllocable || ""}
                onChange={(e) =>
                  handleNumberChange("hausgeldNonAllocable", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Non-allocable landlord expense
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservesPortion">Reserves (EUR/month)</Label>
              <Input
                id="reservesPortion"
                type="number"
                step="1"
                min="0"
                placeholder="e.g., 7"
                value={values.reservesPortion || ""}
                onChange={(e) =>
                  handleNumberChange("reservesPortion", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Instandhaltungsrucklage
              </p>
            </div>
          </div>

          {/* Computed total non-allocable */}
          <div className="rounded-md bg-muted/50 p-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Total Non-allocable Costs</span>
              <span>{CURRENCY_FORMATTER.format(totalNonAllocable)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { OperatingCostsSection }
