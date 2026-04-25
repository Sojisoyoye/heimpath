/**
 * AfA Calculator (Depreciation under § 7 EStG)
 * Calculates annual building depreciation for German rental properties.
 * Covers all three AfA rate tiers: pre-1925 (2.5%), 1925-2022 (2.0%), 2023+ (3.0%).
 */

import { Info, RefreshCw, TrendingDown } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import Colors from "@/common/styles/Colors"
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
import { Separator } from "@/components/ui/separator"
import { FormRow } from "./common/FormRow"
import { MetricCard } from "./common/MetricCard"

/******************************************************************************
                              Types
******************************************************************************/

interface CalculatorInputs {
  propertyValue: string
  /** Land share (%) — land is not depreciable */
  landShare: string
  constructionYear: string
  annualRent: string
  /** Annual interest portion of mortgage (principal is NOT deductible) */
  mortgageInterest: string
  managementFee: string
  insurance: string
  grundsteuer: string
  maintenanceReserve: string
  /** Marginal income tax rate (%) */
  marginalTaxRate: string
}

interface CalculationResults {
  buildingValue: number
  landValue: number
  afaRate: number
  afaPerYear: number
  /** buildingValue / afaPerYear — years to fully depreciate */
  depreciationPeriodYears: number
  totalWerbungskosten: number
  /** annualRent − totalWerbungskosten; can be negative (offsets other income) */
  netTaxableIncome: number
  afaTaxSaving: number
  grossYield: number
  yearlyProjection: Array<{
    year: number
    annualAfaDeduction: number
    cumulativeTaxSaving: number
    buildingValueRemaining: number
  }>
}

interface IProps {
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

const CURRENCY_DECIMAL_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const PERCENT_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Land share presets by location type (%) */
const LAND_SHARE_PRESETS: Array<{ label: string; value: number }> = [
  { label: "City Centre", value: 40 },
  { label: "City", value: 30 },
  { label: "Suburban", value: 20 },
  { label: "Rural", value: 10 },
]

const CURRENT_YEAR = new Date().getFullYear()

const DEFAULT_INPUTS: CalculatorInputs = {
  propertyValue: "",
  landShare: "30",
  constructionYear: "1995",
  annualRent: "",
  mortgageInterest: "",
  managementFee: "",
  insurance: "",
  grundsteuer: "",
  maintenanceReserve: "",
  marginalTaxRate: "42",
}

/******************************************************************************
                              Functions
******************************************************************************/

function parseNumber(v: string): number {
  return Number.parseFloat(v.replace(/[^\d.-]/g, "")) || 0
}

/**
 * AfA rate under § 7 Abs. 4 EStG:
 *   < 1925  → 2.5% (Altbau, 40-year period)
 *   1925–2022 → 2.0% (standard, 50-year period)
 *   ≥ 2023  → 3.0% (new build after Jahressteuergesetz 2022, ~33-year period)
 */
function getAfaRate(constructionYear: number): number {
  if (constructionYear < 1925) return 2.5
  if (constructionYear >= 2023) return 3.0
  return 2.0
}

function calcProjection(
  buildingValue: number,
  afaPerYear: number,
  afaTaxSaving: number,
): CalculationResults["yearlyProjection"] {
  return Array.from({ length: 10 }, (_, i) => {
    const year = i + 1
    return {
      year,
      annualAfaDeduction: afaPerYear,
      cumulativeTaxSaving: afaTaxSaving * year,
      buildingValueRemaining: Math.max(0, buildingValue - afaPerYear * year),
    }
  })
}

/** Main calculation — returns null when required inputs are missing. */
function calculateAfa(inputs: CalculatorInputs): CalculationResults | null {
  const propertyValue = parseNumber(inputs.propertyValue)
  const landShare = parseNumber(inputs.landShare)
  const constructionYear = Number.parseInt(inputs.constructionYear, 10)
  const annualRent = parseNumber(inputs.annualRent)
  const marginalTaxRate = parseNumber(inputs.marginalTaxRate)

  if (propertyValue <= 0 || annualRent <= 0) return null
  if (constructionYear < 1800 || constructionYear > CURRENT_YEAR) return null
  if (marginalTaxRate <= 0) return null

  const buildingValue = propertyValue * (1 - landShare / 100)
  const landValue = propertyValue * (landShare / 100)
  const afaRate = getAfaRate(constructionYear)
  const afaPerYear = buildingValue * (afaRate / 100)
  const depreciationPeriodYears = Math.round(buildingValue / afaPerYear)

  const totalWerbungskosten =
    afaPerYear +
    parseNumber(inputs.mortgageInterest) +
    parseNumber(inputs.managementFee) +
    parseNumber(inputs.insurance) +
    parseNumber(inputs.grundsteuer) +
    parseNumber(inputs.maintenanceReserve)

  const netTaxableIncome = annualRent - totalWerbungskosten
  const afaTaxSaving = afaPerYear * (marginalTaxRate / 100)
  const grossYield = annualRent / propertyValue

  return {
    buildingValue,
    landValue,
    afaRate,
    afaPerYear,
    depreciationPeriodYears,
    totalWerbungskosten,
    netTaxableIncome,
    afaTaxSaving,
    grossYield,
    yearlyProjection: calcProjection(buildingValue, afaPerYear, afaTaxSaving),
  }
}

/******************************************************************************
                              Components
******************************************************************************/

/** 10-year cumulative AfA tax saving bar chart. */
function ProjectionChart(
  props: Readonly<{ data: CalculationResults["yearlyProjection"] }>,
) {
  const { data } = props
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `Yr ${v}`}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => CURRENCY_FORMATTER.format(v)}
        />
        <Tooltip
          formatter={(value) => [
            CURRENCY_DECIMAL_FORMATTER.format(Number(value)),
            "Cumulative Tax Saving",
          ]}
        />
        <Bar
          dataKey="cumulativeTaxSaving"
          radius={[3, 3, 0, 0]}
          fill={Colors.Chart.Green}
          fillOpacity={0.85}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Default component. AfA depreciation calculator (§ 7 EStG). */
function AfaCalculator({ className }: Readonly<IProps>) {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS)

  const results = useMemo(() => calculateAfa(inputs), [inputs])

  const updateInput = useCallback(
    (key: keyof CalculatorInputs, value: string) => {
      setInputs((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const handleReset = useCallback(() => {
    setInputs(DEFAULT_INPUTS)
  }, [])

  const constructionYear = Number.parseInt(inputs.constructionYear, 10)
  const afaRatePreview = Number.isNaN(constructionYear)
    ? 2.0
    : getAfaRate(constructionYear)

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inputs Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              AfA Depreciation Calculator
            </CardTitle>
            <CardDescription>
              Annual building depreciation under § 7 EStG for German rental
              properties
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Property Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Property
              </h4>

              <FormRow
                htmlFor="propertyValue"
                label="Purchase Price (€)"
                tooltip="Total purchase price paid. Land value is excluded from depreciation — use the land share below to split it out."
              >
                <Input
                  id="propertyValue"
                  type="number"
                  min="1"
                  step="1000"
                  placeholder="400000"
                  value={inputs.propertyValue}
                  onChange={(e) => updateInput("propertyValue", e.target.value)}
                />
              </FormRow>

              <FormRow
                htmlFor="landShare"
                label="Land Share (%)"
                tooltip="Percentage of the purchase price attributable to land (Boden). Land cannot be depreciated. City-centre properties typically 30-40%, rural 10-15%."
              >
                <Input
                  id="landShare"
                  type="number"
                  min="0"
                  max="99"
                  step="1"
                  placeholder="30"
                  value={inputs.landShare}
                  onChange={(e) => updateInput("landShare", e.target.value)}
                />
              </FormRow>

              <div className="flex flex-wrap gap-2">
                {LAND_SHARE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => updateInput("landShare", String(p.value))}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      inputs.landShare === String(p.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-foreground",
                    )}
                  >
                    {p.label} {p.value}%
                  </button>
                ))}
              </div>

              <FormRow
                htmlFor="constructionYear"
                label="Construction Year"
                tooltip="Year the building was completed. Determines the AfA rate: before 1925 → 2.5%, 1925–2022 → 2.0%, 2023+ → 3.0% (Jahressteuergesetz 2022)."
              >
                <div className="flex items-center gap-2">
                  <Input
                    id="constructionYear"
                    type="number"
                    min="1800"
                    max={CURRENT_YEAR}
                    step="1"
                    placeholder="1995"
                    value={inputs.constructionYear}
                    onChange={(e) =>
                      updateInput("constructionYear", e.target.value)
                    }
                  />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    → {afaRatePreview}% AfA
                  </span>
                </div>
              </FormRow>

              <FormRow
                htmlFor="annualRent"
                label="Annual Rent (€)"
                tooltip="Total gross rental income per year (Jahreskaltmiete). Exclude utilities passed through to tenants (Nebenkosten)."
              >
                <Input
                  id="annualRent"
                  type="number"
                  min="1"
                  step="100"
                  placeholder="18000"
                  value={inputs.annualRent}
                  onChange={(e) => updateInput("annualRent", e.target.value)}
                />
              </FormRow>
            </div>

            <Separator />

            {/* Annual Werbungskosten */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Annual Werbungskosten (deductible costs)
              </h4>

              <FormRow
                htmlFor="mortgageInterest"
                label="Mortgage Interest (€)"
                optional
                tooltip="Annual interest portion of your mortgage (Schuldzinsen). The principal repayment is NOT tax-deductible."
              >
                <Input
                  id="mortgageInterest"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="8000"
                  value={inputs.mortgageInterest}
                  onChange={(e) =>
                    updateInput("mortgageInterest", e.target.value)
                  }
                />
              </FormRow>

              <FormRow
                htmlFor="managementFee"
                label="Management Fee (€)"
                optional
                tooltip="Hausverwaltungsgebühr — typically 3–5% of annual gross rent."
              >
                <Input
                  id="managementFee"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="720"
                  value={inputs.managementFee}
                  onChange={(e) => updateInput("managementFee", e.target.value)}
                />
              </FormRow>

              <FormRow
                htmlFor="insurance"
                label="Insurance (€)"
                optional
                tooltip="Gebäudeversicherung and landlord liability insurance (Haus- und Grundbesitzerhaftpflicht)."
              >
                <Input
                  id="insurance"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="300"
                  value={inputs.insurance}
                  onChange={(e) => updateInput("insurance", e.target.value)}
                />
              </FormRow>

              <FormRow
                htmlFor="grundsteuer"
                label="Grundsteuer (€)"
                optional
                tooltip="Annual property tax from your Grundsteuerbescheid. Use the Property Tax tab to estimate this."
              >
                <Input
                  id="grundsteuer"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="500"
                  value={inputs.grundsteuer}
                  onChange={(e) => updateInput("grundsteuer", e.target.value)}
                />
              </FormRow>

              <FormRow
                htmlFor="maintenanceReserve"
                label="Maintenance (€)"
                optional
                tooltip="Instandhaltungsrücklage contributions or actual repair costs. Typically 1–2% of property value per year for older buildings."
              >
                <Input
                  id="maintenanceReserve"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="2000"
                  value={inputs.maintenanceReserve}
                  onChange={(e) =>
                    updateInput("maintenanceReserve", e.target.value)
                  }
                />
              </FormRow>
            </div>

            <Separator />

            {/* Tax Rate */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Tax</h4>

              <FormRow
                htmlFor="marginalTaxRate"
                label="Marginal Tax Rate (%)"
                tooltip="Your German income tax rate (Grenzsteuersatz). Common: 14% (entry), 42% (top bracket), 45% (Reichensteuer above €277k)."
              >
                <Input
                  id="marginalTaxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="42"
                  value={inputs.marginalTaxRate}
                  onChange={(e) =>
                    updateInput("marginalTaxRate", e.target.value)
                  }
                />
              </FormRow>
            </div>

            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card>
          <CardHeader>
            <CardTitle>Depreciation Results</CardTitle>
            <CardDescription>
              Annual AfA deduction and tax saving on rental income
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricCard
                    label="Annual AfA Deduction"
                    value={CURRENCY_FORMATTER.format(results.afaPerYear)}
                    description={`${results.afaRate}% of ${CURRENCY_FORMATTER.format(results.buildingValue)} building value`}
                    variant="success"
                  />
                  <MetricCard
                    label="Tax Saving from AfA"
                    value={CURRENCY_FORMATTER.format(results.afaTaxSaving)}
                    description={`At ${inputs.marginalTaxRate}% marginal rate`}
                    variant="success"
                  />
                  <MetricCard
                    label="Net Taxable Income"
                    value={CURRENCY_DECIMAL_FORMATTER.format(
                      results.netTaxableIncome,
                    )}
                    description={
                      results.netTaxableIncome < 0
                        ? "Loss — offsets other income"
                        : "After all deductions"
                    }
                    variant={
                      results.netTaxableIncome < 0 ? "success" : "default"
                    }
                  />
                  <MetricCard
                    label="Gross Rental Yield"
                    value={PERCENT_FORMATTER.format(results.grossYield)}
                    description="Annual rent ÷ purchase price"
                  />
                </div>

                <Separator />

                {/* Depreciation Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    Depreciation Breakdown
                  </h4>
                  <div className="rounded-lg border p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Purchase price</span>
                      <span>
                        {CURRENCY_FORMATTER.format(
                          parseNumber(inputs.propertyValue),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Land value ({inputs.landShare}%)</span>
                      <span>
                        − {CURRENCY_FORMATTER.format(results.landValue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground border-t pt-2">
                      <span>Depreciable building value</span>
                      <span>
                        {CURRENCY_FORMATTER.format(results.buildingValue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>AfA rate (§ 7 EStG)</span>
                      <span>{results.afaRate}%</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Annual AfA deduction</span>
                      <span className="text-green-600">
                        {CURRENCY_FORMATTER.format(results.afaPerYear)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-xs pt-1">
                      <span>Full depreciation period</span>
                      <span>{results.depreciationPeriodYears} years</span>
                    </div>
                  </div>
                </div>

                {/* Rental Income Summary */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Rental Income Summary</h4>
                  <div className="rounded-lg border p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Gross rental income</span>
                      <span>
                        {CURRENCY_FORMATTER.format(
                          parseNumber(inputs.annualRent),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total Werbungskosten</span>
                      <span>
                        −{" "}
                        {CURRENCY_FORMATTER.format(results.totalWerbungskosten)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex justify-between font-medium border-t pt-2",
                        results.netTaxableIncome < 0 && "text-green-600",
                      )}
                    >
                      <span>Net taxable income</span>
                      <span>
                        {CURRENCY_DECIMAL_FORMATTER.format(
                          results.netTaxableIncome,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Enter the purchase price, annual rent, and tax rate to see
                  your AfA deduction
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Results update automatically as you type
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 10-Year Projection */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>10-Year Cumulative Tax Saving</CardTitle>
            <CardDescription>
              {CURRENCY_FORMATTER.format(results.afaPerYear)} AfA per year ×{" "}
              {inputs.marginalTaxRate}% ={" "}
              {CURRENCY_FORMATTER.format(results.afaTaxSaving)} saved annually
              from depreciation alone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProjectionChart data={results.yearlyProjection} />

            <Separator />

            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                Year-by-Year Reference
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 text-left font-medium">Year</th>
                      <th className="py-2 text-right font-medium">
                        Annual AfA
                      </th>
                      <th className="py-2 text-right font-medium">
                        Cumulative Tax Saving
                      </th>
                      <th className="py-2 text-right font-medium">
                        Building Value Left
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.yearlyProjection.map((row) => (
                      <tr key={row.year} className="border-b">
                        <td className="py-2">Year {row.year}</td>
                        <td className="py-2 text-right">
                          {CURRENCY_FORMATTER.format(row.annualAfaDeduction)}
                        </td>
                        <td className="py-2 text-right text-green-600 font-medium">
                          {CURRENCY_FORMATTER.format(row.cumulativeTaxSaving)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {CURRENCY_FORMATTER.format(
                            row.buildingValueRemaining,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Estimates only. The land/building split must be confirmed by
                your Finanzamt via a Kaufpreisaufteilung. Foreign owners must
                file a German Einkommensteuererklärung (income tax return) to
                claim Werbungskosten deductions. Renovation costs before first
                letting may also be depreciable. Consult a{" "}
                <em>Steuerberater</em> for your exact position. The 3% AfA rate
                applies to buildings completed on or after 1 January 2023
                (Jahressteuergesetz 2022).
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { AfaCalculator }
