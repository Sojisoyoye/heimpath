/**
 * Speculation Tax Calculator (§ 23 EStG)
 * Calculates German capital-gains tax liability on property sales within 10 years
 */

import { AlertTriangle, Euro, RefreshCw, Scale } from "lucide-react"
import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
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
import { Disclaimer } from "@/components/ui/disclaimer"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { FormRow } from "./common/FormRow"
import { MetricCard } from "./common/MetricCard"

/******************************************************************************
                              Types
******************************************************************************/

interface CalculatorInputs {
  purchasePrice: string
  purchaseYear: string
  purchaseCosts: string
  renovationCosts: string
  salePrice: string
  sellingCosts: string
  marginalTaxRate: string
  isPrimaryResidence: boolean
}

interface CalculationResults {
  totalAcquisitionCost: number
  netTaxableGain: number
  holdingYears: number
  taxFreeYear: number
  yearsUntilTaxFree: number
  isExempt: boolean
  exemptionReason: string | null
  taxLiability: number
  effectiveTaxRate: number
  netProceeds: number
  netProfit: number
  yearlyProjection: Array<{
    year: number
    holdingYears: number
    netProceeds: number
    taxLiability: number
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

const PERCENT_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const DEFAULT_INPUTS: CalculatorInputs = {
  purchasePrice: "",
  purchaseYear: "",
  purchaseCosts: "",
  renovationCosts: "",
  salePrice: "",
  sellingCosts: "",
  marginalTaxRate: "42",
  isPrimaryResidence: false,
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Parse a potentially formatted number string to a float. */
function parseNumber(v: string): number {
  return Number.parseFloat(v.replace(/[^\d.-]/g, "")) || 0
}

/** Map net profit value to a MetricCard variant. */
function netProfitVariant(value: number): "success" | "danger" | "default" {
  if (value > 0) return "success"
  if (value < 0) return "danger"
  return "default"
}

/** Determine the exemption reason string from the three § 23 EStG conditions. */
function getExemptionReason(
  holdingYears: number,
  isPrimaryResidence: boolean,
  netTaxableGain: number,
): string | null {
  if (holdingYears >= 10) return "10-year rule (§ 23 EStG)"
  if (isPrimaryResidence) return "Primary residence exemption"
  if (netTaxableGain <= 600) return "Below Freigrenze (€600 limit)"
  return null
}

/** Format Y-axis tick values as compact labels (M / k). */
function formatAxisTick(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

/** Calculate speculation tax results from inputs. Returns null when required fields missing. */
function calculateSpeculationTax(
  inputs: CalculatorInputs,
): CalculationResults | null {
  const purchasePrice = parseNumber(inputs.purchasePrice)
  const purchaseYear = Number.parseInt(inputs.purchaseYear, 10)
  const purchaseCosts = parseNumber(inputs.purchaseCosts)
  const renovationCosts = parseNumber(inputs.renovationCosts)
  const salePrice = parseNumber(inputs.salePrice)
  const sellingCosts = parseNumber(inputs.sellingCosts)
  const marginalTaxRate = parseNumber(inputs.marginalTaxRate)

  const currentYear = new Date().getFullYear()

  if (
    !purchasePrice ||
    !salePrice ||
    !purchaseYear ||
    purchaseYear < 1900 ||
    purchaseYear > currentYear
  )
    return null

  const holdingYears = currentYear - purchaseYear
  const taxFreeYear = purchaseYear + 10

  const totalAcquisitionCost = purchasePrice + purchaseCosts + renovationCosts
  const netTaxableGain = salePrice - sellingCosts - totalAcquisitionCost

  const isExempt =
    holdingYears >= 10 || inputs.isPrimaryResidence || netTaxableGain <= 600
  const exemptionReason = getExemptionReason(
    holdingYears,
    inputs.isPrimaryResidence,
    netTaxableGain,
  )

  const taxLiability = isExempt
    ? 0
    : Math.max(0, netTaxableGain) * (marginalTaxRate / 100)
  const netProceeds = salePrice - sellingCosts - taxLiability
  const netProfit = netProceeds - totalAcquisitionCost
  const effectiveTaxRate =
    netTaxableGain > 0 ? taxLiability / netTaxableGain : 0

  const yearlyProjection = Array.from({ length: 12 }, (_, i) => {
    const hy = i + 1
    const taxIfSold =
      hy >= 10 || inputs.isPrimaryResidence || netTaxableGain <= 600
        ? 0
        : Math.max(0, netTaxableGain) * (marginalTaxRate / 100)
    return {
      year: purchaseYear + hy,
      holdingYears: hy,
      netProceeds: salePrice - sellingCosts - taxIfSold,
      taxLiability: taxIfSold,
    }
  })

  return {
    totalAcquisitionCost,
    netTaxableGain,
    holdingYears,
    taxFreeYear,
    yearsUntilTaxFree: Math.max(0, taxFreeYear - currentYear),
    isExempt,
    exemptionReason,
    taxLiability,
    effectiveTaxRate,
    netProceeds,
    netProfit,
    yearlyProjection,
  }
}

/******************************************************************************
                              Components
******************************************************************************/

/** Exemption badge — shown when sale is tax-free. */
function ExemptionBadge(props: Readonly<{ reason: string }>) {
  const { reason } = props
  return (
    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 px-4 py-3">
      <Scale className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
      <div>
        <p className="text-sm font-semibold text-green-800 dark:text-green-300">
          Tax-Free Sale
        </p>
        <p className="text-xs text-green-700 dark:text-green-400">{reason}</p>
      </div>
    </div>
  )
}

/** Banner showing exemption status or taxable-sale warning. */
function TaxStatusBanner(
  props: Readonly<{
    isExempt: boolean
    exemptionReason: string | null
    holdingYears: number
    taxFreeYear: number
  }>,
) {
  const { isExempt, exemptionReason, holdingYears, taxFreeYear } = props

  if (isExempt && exemptionReason) {
    return <ExemptionBadge reason={exemptionReason} />
  }

  const yearsLeft = 10 - holdingYears
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Taxable Sale
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Selling within {yearsLeft} more year{yearsLeft === 1 ? "" : "s"}{" "}
          triggers speculation tax. Wait until {taxFreeYear} for a tax-free
          exit.
        </p>
      </div>
    </div>
  )
}

/** Holding period summary — dates and optional tax-rate rows. */
function HoldingPeriodInfo(
  props: Readonly<{
    holdingYears: number
    taxFreeYear: number
    yearsUntilTaxFree: number
    isExempt: boolean
    effectiveTaxRate: number
    netTaxableGain: number
  }>,
) {
  const {
    holdingYears,
    taxFreeYear,
    yearsUntilTaxFree,
    isExempt,
    effectiveTaxRate,
    netTaxableGain,
  } = props

  return (
    <div className="rounded-lg border p-4 space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">
          Holding Period (estimated)
        </span>
        <span className="font-medium">
          {holdingYears} year{holdingYears === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Tax-Free From</span>
        <span className="font-medium">{taxFreeYear}</span>
      </div>
      {isExempt ? null : (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Years Until Tax-Free</span>
          <span className="font-medium text-amber-600">
            {yearsUntilTaxFree} year{yearsUntilTaxFree === 1 ? "" : "s"}
          </span>
        </div>
      )}
      {isExempt || netTaxableGain <= 0 ? null : (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Effective Tax Rate</span>
          <span className="font-medium">
            {PERCENT_FORMATTER.format(effectiveTaxRate)}
          </span>
        </div>
      )}
    </div>
  )
}

/** Stacked bar chart of net proceeds vs tax liability over 12 years. */
function ProjectionChart(
  props: Readonly<{
    projection: CalculationResults["yearlyProjection"]
    taxFreeYear: number
    purchaseYear: number
  }>,
) {
  const { projection, taxFreeYear, purchaseYear } = props

  const chartData = useMemo(
    () =>
      projection.map((p) => ({
        name: `Yr ${p.holdingYears}`,
        year: p.year,
        netProceeds: Math.round(p.netProceeds),
        taxLiability: Math.round(p.taxLiability),
      })),
    [projection],
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAxisTick} />
        <Tooltip
          formatter={(value, name) => {
            const label =
              name === "netProceeds" ? "Net Proceeds" : "Tax Liability"
            return [CURRENCY_FORMATTER.format(Number(value)), label]
          }}
          labelFormatter={String}
        />
        <ReferenceLine
          x={`Yr ${taxFreeYear - purchaseYear}`}
          stroke={Colors.Chart.Green}
          strokeWidth={2}
          strokeDasharray="4 4"
          label={{ value: "Tax-Free", position: "top", fontSize: 11 }}
        />
        <Bar
          dataKey="netProceeds"
          name="netProceeds"
          stackId="proceeds"
          fill={Colors.Chart.Blue}
          fillOpacity={0.85}
        />
        <Bar
          dataKey="taxLiability"
          name="taxLiability"
          stackId="proceeds"
          fill={Colors.Chart.Amber}
          fillOpacity={0.85}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Default component. Speculation tax calculator (§ 23 EStG). */
function SpeculationTaxCalculator({ className }: Readonly<IProps>) {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS)

  const results = useMemo(() => calculateSpeculationTax(inputs), [inputs])

  const updateInput = (
    key: keyof CalculatorInputs,
    value: string | boolean,
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  const handlePriceInput = (
    key: keyof CalculatorInputs,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value.replace(/[^\d]/g, "")
    updateInput(key, value)
  }

  const handleReset = () => {
    setInputs(DEFAULT_INPUTS)
  }

  /** Format price input display value (localized, digits only). */
  const priceDisplay = (raw: string) =>
    raw ? Number.parseInt(raw, 10).toLocaleString("de-DE") : ""

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Speculation Tax Calculator
            </CardTitle>
            <CardDescription>
              Estimate capital-gains tax on property sales within 10 years (§ 23
              EStG)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Purchase Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Purchase Details
              </h4>
              <FormRow htmlFor="purchasePrice" label="Purchase Price">
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="purchasePrice"
                    type="text"
                    inputMode="numeric"
                    placeholder="400,000"
                    value={priceDisplay(inputs.purchasePrice)}
                    onChange={(e) => handlePriceInput("purchasePrice", e)}
                    className="pl-9"
                  />
                </div>
              </FormRow>
              <FormRow htmlFor="purchaseYear" label="Purchase Year">
                <Input
                  id="purchaseYear"
                  type="text"
                  inputMode="numeric"
                  placeholder="2020"
                  maxLength={4}
                  value={inputs.purchaseYear}
                  onChange={(e) =>
                    updateInput(
                      "purchaseYear",
                      e.target.value.replace(/[^\d]/g, ""),
                    )
                  }
                />
              </FormRow>
              <FormRow htmlFor="purchaseCosts" label="Closing Costs" optional>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="purchaseCosts"
                    type="text"
                    inputMode="numeric"
                    placeholder="30,000"
                    value={priceDisplay(inputs.purchaseCosts)}
                    onChange={(e) => handlePriceInput("purchaseCosts", e)}
                    className="pl-9"
                  />
                </div>
              </FormRow>
              <FormRow
                htmlFor="renovationCosts"
                label="Renovation Costs"
                optional
              >
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="renovationCosts"
                    type="text"
                    inputMode="numeric"
                    placeholder="20,000"
                    value={priceDisplay(inputs.renovationCosts)}
                    onChange={(e) => handlePriceInput("renovationCosts", e)}
                    className="pl-9"
                  />
                </div>
              </FormRow>
            </div>

            <Separator />

            {/* Sale Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Planned Sale
              </h4>
              <FormRow htmlFor="salePrice" label="Sale Price">
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="salePrice"
                    type="text"
                    inputMode="numeric"
                    placeholder="500,000"
                    value={priceDisplay(inputs.salePrice)}
                    onChange={(e) => handlePriceInput("salePrice", e)}
                    className="pl-9"
                  />
                </div>
              </FormRow>
              <FormRow
                htmlFor="sellingCosts"
                label="Selling Costs"
                optional
                tooltip="Broker commission, notary fees, etc."
              >
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="sellingCosts"
                    type="text"
                    inputMode="numeric"
                    placeholder="15,000"
                    value={priceDisplay(inputs.sellingCosts)}
                    onChange={(e) => handlePriceInput("sellingCosts", e)}
                    className="pl-9"
                  />
                </div>
              </FormRow>
            </div>

            <Separator />

            {/* Tax Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Tax Profile
              </h4>
              <FormRow
                htmlFor="marginalTaxRate"
                label="Marginal Tax Rate (%)"
                tooltip="Your German income tax top rate (§ 32a EStG). Common values: 42% (high earners), 45% (Reichensteuer)."
              >
                <Input
                  id="marginalTaxRate"
                  type="number"
                  min="0"
                  max="45"
                  step="1"
                  value={inputs.marginalTaxRate}
                  onChange={(e) =>
                    updateInput("marginalTaxRate", e.target.value)
                  }
                />
              </FormRow>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                <span className="text-sm leading-tight sm:w-48 sm:shrink-0">
                  Primary Residence
                </span>
                <div className="flex items-center gap-3">
                  <Switch
                    id="isPrimaryResidence"
                    checked={inputs.isPrimaryResidence}
                    onCheckedChange={(checked) =>
                      updateInput("isPrimaryResidence", checked)
                    }
                  />
                  <label
                    htmlFor="isPrimaryResidence"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Used as primary residence in year of sale + 2 preceding
                    years
                  </label>
                </div>
              </div>
            </div>

            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Analysis</CardTitle>
            <CardDescription>
              Based on § 23 EStG — private sale (Privates Veräußerungsgeschäft)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results ? (
              <div className="space-y-6">
                <TaxStatusBanner
                  isExempt={results.isExempt}
                  exemptionReason={results.exemptionReason}
                  holdingYears={results.holdingYears}
                  taxFreeYear={results.taxFreeYear}
                />

                {/* Key Metrics */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricCard
                    label="Net Taxable Gain"
                    value={CURRENCY_FORMATTER.format(results.netTaxableGain)}
                    description="Sale price − costs − acquisition"
                    variant={results.netTaxableGain > 0 ? "warning" : "default"}
                  />
                  <MetricCard
                    label="Tax Liability"
                    value={CURRENCY_FORMATTER.format(results.taxLiability)}
                    description={
                      results.isExempt
                        ? "Exempt"
                        : `At ${inputs.marginalTaxRate}% marginal rate`
                    }
                    variant={results.taxLiability > 0 ? "danger" : "success"}
                  />
                  <MetricCard
                    label="Net Proceeds"
                    value={CURRENCY_FORMATTER.format(results.netProceeds)}
                    description="After selling costs and tax"
                  />
                  <MetricCard
                    label="Net Profit"
                    value={CURRENCY_FORMATTER.format(results.netProfit)}
                    description="Proceeds minus total acquisition cost"
                    variant={netProfitVariant(results.netProfit)}
                  />
                </div>

                <Separator />

                {/* Cost Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-medium">Cost Breakdown</h4>
                  <div className="rounded-lg border p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Purchase Price</span>
                      <span>
                        {CURRENCY_FORMATTER.format(
                          parseNumber(inputs.purchasePrice),
                        )}
                      </span>
                    </div>
                    {parseNumber(inputs.purchaseCosts) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>+ Closing Costs</span>
                        <span>
                          {CURRENCY_FORMATTER.format(
                            parseNumber(inputs.purchaseCosts),
                          )}
                        </span>
                      </div>
                    )}
                    {parseNumber(inputs.renovationCosts) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>+ Renovation Costs</span>
                        <span>
                          {CURRENCY_FORMATTER.format(
                            parseNumber(inputs.renovationCosts),
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Total Acquisition Cost</span>
                      <span>
                        {CURRENCY_FORMATTER.format(
                          results.totalAcquisitionCost,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span>Sale Price</span>
                      <span>
                        {CURRENCY_FORMATTER.format(
                          parseNumber(inputs.salePrice),
                        )}
                      </span>
                    </div>
                    {parseNumber(inputs.sellingCosts) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>− Selling Costs</span>
                        <span>
                          {CURRENCY_FORMATTER.format(
                            parseNumber(inputs.sellingCosts),
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>− Tax Liability</span>
                      <span
                        className={
                          results.taxLiability > 0 ? "text-red-600" : ""
                        }
                      >
                        {CURRENCY_FORMATTER.format(results.taxLiability)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Net Proceeds</span>
                      <span
                        className={
                          results.netProceeds > results.totalAcquisitionCost
                            ? "text-green-600"
                            : ""
                        }
                      >
                        {CURRENCY_FORMATTER.format(results.netProceeds)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Holding Period Info */}
                <HoldingPeriodInfo
                  holdingYears={results.holdingYears}
                  taxFreeYear={results.taxFreeYear}
                  yearsUntilTaxFree={results.yearsUntilTaxFree}
                  isExempt={results.isExempt}
                  effectiveTaxRate={results.effectiveTaxRate}
                  netTaxableGain={results.netTaxableGain}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Scale className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Enter a{" "}
                  <span className="font-medium text-foreground">
                    Purchase Price
                  </span>
                  ,{" "}
                  <span className="font-medium text-foreground">
                    Purchase Year
                  </span>
                  , and{" "}
                  <span className="font-medium text-foreground">
                    Sale Price
                  </span>{" "}
                  to see your tax analysis
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Results update automatically as you type
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 12-Year Projection Chart */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>12-Year Net Proceeds Projection</CardTitle>
            <CardDescription>
              Net proceeds (blue) vs. tax liability (amber) by year of sale —
              dashed green line marks the tax-free threshold
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Chart Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span>Net Proceeds</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span>Tax Liability</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 border-2 border-dashed border-green-500" />
                <span>Tax-Free Threshold (Year 10)</span>
              </span>
            </div>

            <ProjectionChart
              projection={results.yearlyProjection}
              taxFreeYear={results.taxFreeYear}
              purchaseYear={Number.parseInt(inputs.purchaseYear, 10)}
            />

            <Separator />

            {/* Projection Table */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                Year-by-Year Breakdown
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 text-left font-medium">
                        Holding Year
                      </th>
                      <th className="py-2 text-left font-medium">
                        Calendar Year
                      </th>
                      <th className="py-2 text-right font-medium">
                        Tax Liability
                      </th>
                      <th className="py-2 text-right font-medium">
                        Net Proceeds
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.yearlyProjection.map((row) => (
                      <tr
                        key={row.year}
                        className={cn(
                          "border-b",
                          row.holdingYears >= 10 &&
                            "bg-green-50 dark:bg-green-950/20",
                        )}
                      >
                        <td className="py-2 font-medium">
                          Year {row.holdingYears}
                          {row.holdingYears === 10 && (
                            <span className="ml-2 text-xs text-green-600 font-semibold">
                              Tax-Free
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {row.year}
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={
                              row.taxLiability > 0
                                ? "text-red-600"
                                : "text-green-600"
                            }
                          >
                            {CURRENCY_FORMATTER.format(row.taxLiability)}
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium">
                          {CURRENCY_FORMATTER.format(row.netProceeds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legal Disclaimer */}
            <Disclaimer>
              This calculator provides estimates only and does not constitute
              tax advice. The § 23 EStG speculation tax is assessed at your
              personal marginal income tax rate. Consult a qualified{" "}
              <em>Steuerberater</em> for your specific situation. Church tax
              (Kirchensteuer) and solidarity surcharge (Solidaritätszuschlag)
              are not included.
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

export { SpeculationTaxCalculator }
