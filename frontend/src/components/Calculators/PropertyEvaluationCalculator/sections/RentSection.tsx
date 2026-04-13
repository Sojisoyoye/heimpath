/**
 * Rent, Taxes, Forecast Section
 * Inputs for rental income, depreciation, tax settings, and forecast assumptions
 */

import { Banknote, Info } from "lucide-react"
import { GERMAN_STATES } from "@/common/constants"
import { SECTION_COLORS } from "@/common/constants/propertyEvaluation"
import { MARKET_DATA_BY_STATE } from "@/common/constants/propertyGoals"
import { cn } from "@/common/utils"
import { EUR_FORMATTER_2 as CURRENCY_FORMATTER } from "@/common/utils/formatters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FormRow } from "../FormRow"
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
      <CardContent className="space-y-3 pt-4">
        {/* Monthly Rent subsection */}
        <p className="text-sm font-medium text-muted-foreground">
          Monthly Rent (retrieve from Expose)
        </p>
        <FormRow
          htmlFor="rentPerSqm"
          label="Rent per m² (EUR)"
          tooltip="Monthly cold rent (Kaltmiete) per square meter, excluding utilities and operating costs"
        >
          <Input
            id="rentPerSqm"
            type="number"
            step="0.5"
            min="0"
            placeholder="e.g., 12"
            value={values.rentPerSqm || ""}
            onChange={(e) => handleNumberChange("rentPerSqm", e.target.value)}
          />
        </FormRow>
        <FormRow htmlFor="parkingRent" label="Parking Rent (EUR/mo)">
          <Input
            id="parkingRent"
            type="number"
            step="10"
            min="0"
            placeholder="e.g., 50"
            value={values.parkingRent || ""}
            onChange={(e) => handleNumberChange("parkingRent", e.target.value)}
          />
        </FormRow>
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
          <FormRow
            htmlFor="depreciationRate"
            label="Depreciation Rate (%)"
            tooltip="AfA (Absetzung für Abnutzung) — tax-deductible building wear. 2% for buildings built after 1924, 2.5% for older"
          >
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
          </FormRow>
          <FormRow
            htmlFor="buildingShare"
            label="Building Share (%)"
            tooltip="Percentage of purchase price attributable to the building (not land). Used for depreciation calculation"
          >
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
          </FormRow>
          <FormRow
            htmlFor="marginalTaxRate"
            label="Marginal Tax Rate (%)"
            tooltip="Your personal income tax rate in Germany (Einkommensteuer). Standard brackets range from 14% to 45%"
          >
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
          </FormRow>
        </div>

        {/* Tax Context subsection */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            Tax Context
          </p>
          <FormRow
            htmlFor="personalTaxableIncome"
            label="Taxable Income (EUR/yr)"
            tooltip="Your annual taxable income from employment or other sources. Used for progressive tax calculation (§32a EStG)"
          >
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
          </FormRow>
        </div>

        {/* Renovation subsection */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            Renovation
          </p>
          <FormRow
            htmlFor="renovationYear"
            label="Renovation Year"
            tooltip="Year number (1-10) when renovation occurs. Set to 0 for no renovation"
          >
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
          </FormRow>
          <FormRow
            htmlFor="renovationCost"
            label="Renovation Cost (EUR)"
            tooltip="Total renovation cost, tax-deductible in the renovation year"
          >
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
          </FormRow>
        </div>

        {/* Analysis Period subsection */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            Analysis Period
          </p>
          <FormRow
            htmlFor="startYear"
            label="Start Year"
            tooltip="First year of the investment analysis"
          >
            <Input
              id="startYear"
              type="number"
              step="1"
              min="2020"
              max="2040"
              value={values.startYear || ""}
              onChange={(e) => handleNumberChange("startYear", e.target.value)}
            />
          </FormRow>
          <FormRow
            htmlFor="analysisYears"
            label="Analysis Years"
            tooltip="Number of years to project (last year is the exit/sale year)"
          >
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
          </FormRow>
        </div>

        {/* Forecast subsection */}
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-muted-foreground">Forecast</p>
          <FormRow
            htmlFor="costIncrease"
            label="Cost Increase p.a. (%)"
            tooltip="Expected annual increase in operating costs, typically tracking inflation"
          >
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
          </FormRow>
          <FormRow
            htmlFor="rentIncrease"
            label="Rent Increase p.a. (%)"
            tooltip="Expected annual rent increase. Subject to Mietpreisbremse (rent cap) in regulated areas"
          >
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
          </FormRow>
          <FormRow
            htmlFor="valueIncrease"
            label="Value Increase p.a. (%)"
            tooltip="Expected annual property value appreciation rate"
          >
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
          </FormRow>
          <FormRow
            htmlFor="equityInterest"
            label="Equity Interest p.a. (%)"
            tooltip="Opportunity cost — what your equity could earn if invested elsewhere (e.g., stock market returns)"
          >
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
          </FormRow>
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentSection }
