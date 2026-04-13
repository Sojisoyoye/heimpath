/**
 * Rent, Taxes, Forecast Section
 * Inputs for rental income, depreciation, tax settings, and forecast assumptions
 */

import { Banknote, Info } from "lucide-react"
import { GERMAN_STATES } from "@/common/constants"
import { SECTION_COLORS } from "@/common/constants/propertyEvaluation"
import { MARKET_DATA_BY_STATE } from "@/common/constants/propertyGoals"
import { cn } from "@/common/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldTooltip } from "../FieldTooltip"
import type { RentInputs } from "../types"

interface IProps {
  values: RentInputs
  squareMeters: number
  totalAllocableCosts: number
  stateCode?: string
  onChange: (updates: Partial<RentInputs>) => void
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

/** Default component. Rent, Taxes, Forecast section. */
function RentSection(props: IProps) {
  const {
    values,
    squareMeters,
    totalAllocableCosts,
    stateCode,
    onChange,
    className,
  } = props

  const marketData = stateCode ? MARKET_DATA_BY_STATE[stateCode] : undefined
  const stateName = stateCode
    ? GERMAN_STATES.find((s) => s.code === stateCode)?.name
    : undefined

  const handleNumberChange = (field: keyof RentInputs, value: string) => {
    const num = parseFloat(value) || 0
    onChange({ [field]: num })
  }

  const coldRentMonthly = values.rentPerSqm * squareMeters + values.parkingRent
  const warmRentMonthly = coldRentMonthly + totalAllocableCosts

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("py-3", SECTION_COLORS.rent)}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-4 w-4" />
          Rent, Taxes, Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Monthly Rent subsection */}
        <p className="text-sm font-medium text-muted-foreground">
          Monthly Rent (retrieve from Expose)
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rentPerSqm">
              Rent per m² (EUR)
              <FieldTooltip text="Monthly cold rent (Kaltmiete) per square meter, excluding utilities and operating costs" />
            </Label>
            <Input
              id="rentPerSqm"
              type="number"
              step="0.5"
              min="0"
              placeholder="e.g., 12"
              value={values.rentPerSqm || ""}
              onChange={(e) => handleNumberChange("rentPerSqm", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parkingRent">Parking Rent (EUR/month)</Label>
            <Input
              id="parkingRent"
              type="number"
              step="10"
              min="0"
              placeholder="e.g., 50"
              value={values.parkingRent || ""}
              onChange={(e) =>
                handleNumberChange("parkingRent", e.target.value)
              }
            />
          </div>
        </div>
        {marketData && stateName && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="h-3 w-3 shrink-0" />
            Average in {stateName}:{" "}
            {CURRENCY_FORMATTER.format(marketData.avgRentPerSqm)}/m² (range:{" "}
            {CURRENCY_FORMATTER.format(marketData.rentRange.min)} –{" "}
            {CURRENCY_FORMATTER.format(marketData.rentRange.max)})
          </p>
        )}

        {/* Rent summary */}
        {squareMeters > 0 && (
          <div className="rounded-md bg-green-50 p-3 space-y-2 dark:bg-green-950/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Cold Rent</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(values.rentPerSqm * squareMeters)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+ Parking Space</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(values.parkingRent)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span className="text-muted-foreground">= Total Cold Rent</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(coldRentMonthly)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+ Allocable Costs</span>
              <span className="font-medium">
                {CURRENCY_FORMATTER.format(totalAllocableCosts)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-2 font-semibold">
              <span>= Warm Rent</span>
              <span>{CURRENCY_FORMATTER.format(warmRentMonthly)}</span>
            </div>
          </div>
        )}

        {/* Taxes subsection */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">Taxes</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="depreciationRate">
                Depreciation Rate (%)
                <FieldTooltip text="AfA (Absetzung für Abnutzung) — tax-deductible building wear. 2% for buildings built after 1924, 2.5% for older" />
              </Label>
              <Input
                id="depreciationRate"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={values.depreciationRatePercent || ""}
                onChange={(e) =>
                  handleNumberChange("depreciationRatePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buildingShare">
                Building Share (%)
                <FieldTooltip text="Percentage of purchase price attributable to the building (not land). Used for depreciation calculation" />
              </Label>
              <Input
                id="buildingShare"
                type="number"
                step="5"
                min="0"
                max="100"
                value={values.buildingSharePercent || ""}
                onChange={(e) =>
                  handleNumberChange("buildingSharePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marginalTaxRate">
                Marginal Tax Rate (%)
                <FieldTooltip text="Your personal income tax rate in Germany (Einkommensteuer). Standard brackets range from 14% to 45%" />
              </Label>
              <Input
                id="marginalTaxRate"
                type="number"
                step="1"
                min="0"
                max="50"
                placeholder="e.g., 42"
                value={values.marginalTaxRatePercent || ""}
                onChange={(e) =>
                  handleNumberChange("marginalTaxRatePercent", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Personal income tax bracket
              </p>
            </div>
          </div>
        </div>

        {/* Tax Context subsection */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            Tax Context
          </p>
          <div className="grid gap-4 sm:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="personalTaxableIncome">
                Personal Taxable Income (EUR/year)
                <FieldTooltip text="Your annual taxable income from employment or other sources. Used for progressive tax calculation (§32a EStG)" />
              </Label>
              <Input
                id="personalTaxableIncome"
                type="number"
                step="1000"
                min="0"
                placeholder="e.g., 60000"
                value={values.personalTaxableIncome || ""}
                onChange={(e) =>
                  handleNumberChange("personalTaxableIncome", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* Renovation subsection */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            Renovation
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="renovationYear">
                Renovation Year
                <FieldTooltip text="Year number (1-10) when renovation occurs. Set to 0 for no renovation" />
              </Label>
              <Input
                id="renovationYear"
                type="number"
                step="1"
                min="0"
                max="20"
                placeholder="0 = none"
                value={values.renovationYear || ""}
                onChange={(e) =>
                  handleNumberChange("renovationYear", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="renovationCost">
                Renovation Cost (EUR)
                <FieldTooltip text="Total renovation cost, tax-deductible in the renovation year" />
              </Label>
              <Input
                id="renovationCost"
                type="number"
                step="1000"
                min="0"
                placeholder="e.g., 15000"
                value={values.renovationCost || ""}
                onChange={(e) =>
                  handleNumberChange("renovationCost", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* Analysis Period subsection */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            Analysis Period
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startYear">
                Start Year
                <FieldTooltip text="First year of the investment analysis" />
              </Label>
              <Input
                id="startYear"
                type="number"
                step="1"
                min="2020"
                max="2040"
                value={values.startYear || ""}
                onChange={(e) =>
                  handleNumberChange("startYear", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="analysisYears">
                Analysis Years
                <FieldTooltip text="Number of years to project (last year is the exit/sale year)" />
              </Label>
              <Input
                id="analysisYears"
                type="number"
                step="1"
                min="2"
                max="30"
                value={values.analysisYears || ""}
                onChange={(e) =>
                  handleNumberChange("analysisYears", e.target.value)
                }
              />
            </div>
          </div>
        </div>

        {/* Forecast subsection */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">Forecast</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="costIncrease">
                Cost Increase p.a. (%)
                <FieldTooltip text="Expected annual increase in operating costs, typically tracking inflation" />
              </Label>
              <Input
                id="costIncrease"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={values.costIncreasePercent || ""}
                onChange={(e) =>
                  handleNumberChange("costIncreasePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentIncrease">
                Rent Increase p.a. (%)
                <FieldTooltip text="Expected annual rent increase. Subject to Mietpreisbremse (rent cap) in regulated areas" />
              </Label>
              <Input
                id="rentIncrease"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={values.rentIncreasePercent || ""}
                onChange={(e) =>
                  handleNumberChange("rentIncreasePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valueIncrease">
                Value Increase p.a. (%)
                <FieldTooltip text="Expected annual property value appreciation rate" />
              </Label>
              <Input
                id="valueIncrease"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={values.valueIncreasePercent || ""}
                onChange={(e) =>
                  handleNumberChange("valueIncreasePercent", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equityInterest">
                Interest on Equity p.a. (%)
                <FieldTooltip text="Opportunity cost — what your equity could earn if invested elsewhere (e.g., stock market returns)" />
              </Label>
              <Input
                id="equityInterest"
                type="number"
                step="0.5"
                min="0"
                max="20"
                value={values.equityInterestPercent || ""}
                onChange={(e) =>
                  handleNumberChange("equityInterestPercent", e.target.value)
                }
              />
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

export { RentSection }
