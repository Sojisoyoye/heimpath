/**
 * ROI Calculator Component
 * Calculates rental investment returns and projections
 */

import { useState, useMemo } from "react"
import { TrendingUp, Euro, Info, Download, RefreshCw } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface IProps {
  className?: string
}

/******************************************************************************
                              Types
******************************************************************************/

interface ROIResults {
  // Annual figures
  grossRentalIncome: number
  netOperatingIncome: number
  annualCashFlow: number

  // Key metrics
  grossYield: number
  netYield: number
  capRate: number
  cashOnCashReturn: number

  // Projections (5-year)
  projectedValues: {
    year: number
    propertyValue: number
    cumulativeCashFlow: number
    totalReturn: number
    totalReturnPercent: number
  }[]
}

interface CalculatorInputs {
  purchasePrice: string
  downPayment: string
  monthlyRent: string
  monthlyExpenses: string
  annualAppreciation: string
  vacancyRate: string
  mortgageRate: string
  mortgageTerm: string
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
  maximumFractionDigits: 2,
})

/******************************************************************************
                              Functions
******************************************************************************/

/** Parse number from input string. */
function parseNumber(value: string): number {
  const cleaned = value.replace(/[^\d.]/g, "")
  return parseFloat(cleaned) || 0
}

/** Calculate monthly mortgage payment. */
function calculateMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0

  const monthlyRate = annualRate / 100 / 12
  const numPayments = termYears * 12

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  )
}

/** Calculate ROI metrics. */
function calculateROI(inputs: CalculatorInputs): ROIResults | null {
  const purchasePrice = parseNumber(inputs.purchasePrice)
  const downPayment = parseNumber(inputs.downPayment)
  const monthlyRent = parseNumber(inputs.monthlyRent)
  const monthlyExpenses = parseNumber(inputs.monthlyExpenses)
  const annualAppreciation = parseNumber(inputs.annualAppreciation) / 100
  const vacancyRate = parseNumber(inputs.vacancyRate) / 100
  const mortgageRate = parseNumber(inputs.mortgageRate)
  const mortgageTerm = parseNumber(inputs.mortgageTerm)

  if (purchasePrice <= 0 || monthlyRent <= 0) return null

  // Calculate financing
  const loanAmount = purchasePrice - downPayment
  const monthlyMortgage = calculateMortgagePayment(
    loanAmount,
    mortgageRate,
    mortgageTerm
  )

  // Annual income calculations
  const grossRentalIncome = monthlyRent * 12
  const effectiveRentalIncome = grossRentalIncome * (1 - vacancyRate)
  const annualExpenses = monthlyExpenses * 12
  const netOperatingIncome = effectiveRentalIncome - annualExpenses
  const annualMortgage = monthlyMortgage * 12
  const annualCashFlow = netOperatingIncome - annualMortgage

  // Key metrics
  const grossYield = grossRentalIncome / purchasePrice
  const netYield = netOperatingIncome / purchasePrice
  const capRate = netOperatingIncome / purchasePrice
  const cashOnCashReturn = downPayment > 0 ? annualCashFlow / downPayment : 0

  // 5-year projections
  const projectedValues = []
  let cumulativeCashFlow = 0

  for (let year = 1; year <= 5; year++) {
    const propertyValue = purchasePrice * Math.pow(1 + annualAppreciation, year)
    const yearCashFlow = annualCashFlow * Math.pow(1.02, year - 1) // Assume 2% rent increase
    cumulativeCashFlow += yearCashFlow

    const appreciation = propertyValue - purchasePrice
    const totalReturn = appreciation + cumulativeCashFlow
    const totalReturnPercent = downPayment > 0 ? totalReturn / downPayment : 0

    projectedValues.push({
      year,
      propertyValue,
      cumulativeCashFlow,
      totalReturn,
      totalReturnPercent,
    })
  }

  return {
    grossRentalIncome,
    netOperatingIncome,
    annualCashFlow,
    grossYield,
    netYield,
    capRate,
    cashOnCashReturn,
    projectedValues,
  }
}

/******************************************************************************
                              Components
******************************************************************************/

/** Metric card display. */
function MetricCard(props: {
  label: string
  value: string
  description?: string
  variant?: "default" | "success" | "warning" | "danger"
}) {
  const { label, value, description, variant = "default" } = props

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        variant === "success" && "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30",
        variant === "warning" && "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
        variant === "danger" && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold",
          variant === "success" && "text-green-600",
          variant === "warning" && "text-amber-600",
          variant === "danger" && "text-red-600"
        )}
      >
        {value}
      </p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
}

/** Projection row. */
function ProjectionRow(props: {
  year: number
  propertyValue: number
  cumulativeCashFlow: number
  totalReturn: number
  totalReturnPercent: number
}) {
  const { year, propertyValue, cumulativeCashFlow, totalReturn, totalReturnPercent } = props

  return (
    <tr className="border-b">
      <td className="py-2 font-medium">Year {year}</td>
      <td className="py-2 text-right">{CURRENCY_FORMATTER.format(propertyValue)}</td>
      <td className="py-2 text-right">{CURRENCY_FORMATTER.format(cumulativeCashFlow)}</td>
      <td className="py-2 text-right">{CURRENCY_FORMATTER.format(totalReturn)}</td>
      <td className="py-2 text-right font-medium text-green-600">
        {PERCENT_FORMATTER.format(totalReturnPercent)}
      </td>
    </tr>
  )
}

/** Default component. ROI calculator. */
function ROICalculator(props: IProps) {
  const { className } = props

  const [inputs, setInputs] = useState<CalculatorInputs>({
    purchasePrice: "",
    downPayment: "",
    monthlyRent: "",
    monthlyExpenses: "",
    annualAppreciation: "2",
    vacancyRate: "5",
    mortgageRate: "4",
    mortgageTerm: "25",
  })

  const results = useMemo(() => calculateROI(inputs), [inputs])

  const updateInput = (key: keyof CalculatorInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  const handlePriceInput = (
    key: keyof CalculatorInputs,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/[^\d]/g, "")
    updateInput(key, value)
  }

  const handleReset = () => {
    setInputs({
      purchasePrice: "",
      downPayment: "",
      monthlyRent: "",
      monthlyExpenses: "",
      annualAppreciation: "2",
      vacancyRate: "5",
      mortgageRate: "4",
      mortgageTerm: "25",
    })
  }

  const handleExport = () => {
    if (!results) return

    const data = {
      inputs,
      results,
      generatedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `roi-calculation-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getCashFlowVariant = (value: number) => {
    if (value > 0) return "success"
    if (value < 0) return "danger"
    return "default"
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              ROI Calculator
            </CardTitle>
            <CardDescription>
              Calculate rental investment returns and projections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Purchase Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Purchase Details
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="purchasePrice"
                      type="text"
                      inputMode="numeric"
                      placeholder="500,000"
                      value={
                        inputs.purchasePrice
                          ? parseInt(inputs.purchasePrice).toLocaleString("de-DE")
                          : ""
                      }
                      onChange={(e) => handlePriceInput("purchasePrice", e)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downPayment">Down Payment</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="downPayment"
                      type="text"
                      inputMode="numeric"
                      placeholder="100,000"
                      value={
                        inputs.downPayment
                          ? parseInt(inputs.downPayment).toLocaleString("de-DE")
                          : ""
                      }
                      onChange={(e) => handlePriceInput("downPayment", e)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rental Income */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Rental Income
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Monthly Rent</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="monthlyRent"
                      type="text"
                      inputMode="numeric"
                      placeholder="1,500"
                      value={
                        inputs.monthlyRent
                          ? parseInt(inputs.monthlyRent).toLocaleString("de-DE")
                          : ""
                      }
                      onChange={(e) => handlePriceInput("monthlyRent", e)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyExpenses">Monthly Expenses</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="monthlyExpenses"
                      type="text"
                      inputMode="numeric"
                      placeholder="300"
                      value={
                        inputs.monthlyExpenses
                          ? parseInt(inputs.monthlyExpenses).toLocaleString("de-DE")
                          : ""
                      }
                      onChange={(e) => handlePriceInput("monthlyExpenses", e)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Assumptions */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Assumptions
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vacancyRate">Vacancy Rate (%)</Label>
                  <Input
                    id="vacancyRate"
                    type="number"
                    min="0"
                    max="100"
                    value={inputs.vacancyRate}
                    onChange={(e) => updateInput("vacancyRate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualAppreciation">
                    Annual Appreciation (%)
                  </Label>
                  <Input
                    id="annualAppreciation"
                    type="number"
                    min="0"
                    max="20"
                    value={inputs.annualAppreciation}
                    onChange={(e) =>
                      updateInput("annualAppreciation", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mortgageRate">Mortgage Rate (%)</Label>
                  <Input
                    id="mortgageRate"
                    type="number"
                    min="0"
                    max="15"
                    step="0.1"
                    value={inputs.mortgageRate}
                    onChange={(e) => updateInput("mortgageRate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mortgageTerm">Mortgage Term (years)</Label>
                  <Input
                    id="mortgageTerm"
                    type="number"
                    min="5"
                    max="40"
                    value={inputs.mortgageTerm}
                    onChange={(e) => updateInput("mortgageTerm", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Investment Analysis</CardTitle>
            <CardDescription>Key metrics and returns</CardDescription>
          </CardHeader>
          <CardContent>
            {results ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricCard
                    label="Gross Yield"
                    value={PERCENT_FORMATTER.format(results.grossYield)}
                    description="Annual rent / purchase price"
                  />
                  <MetricCard
                    label="Cap Rate"
                    value={PERCENT_FORMATTER.format(results.capRate)}
                    description="NOI / purchase price"
                  />
                  <MetricCard
                    label="Cash-on-Cash Return"
                    value={PERCENT_FORMATTER.format(results.cashOnCashReturn)}
                    description="Annual cash flow / down payment"
                    variant={getCashFlowVariant(results.cashOnCashReturn)}
                  />
                  <MetricCard
                    label="Annual Cash Flow"
                    value={CURRENCY_FORMATTER.format(results.annualCashFlow)}
                    description="After mortgage payments"
                    variant={getCashFlowVariant(results.annualCashFlow)}
                  />
                </div>

                <Separator />

                {/* Income Summary */}
                <div className="space-y-2">
                  <h4 className="font-medium">Annual Summary</h4>
                  <div className="rounded-lg border p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Gross Rental Income</span>
                      <span>{CURRENCY_FORMATTER.format(results.grossRentalIncome)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>- Operating Expenses</span>
                      <span>
                        {CURRENCY_FORMATTER.format(
                          results.grossRentalIncome - results.netOperatingIncome
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Net Operating Income</span>
                      <span>{CURRENCY_FORMATTER.format(results.netOperatingIncome)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Results
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Enter property details to see ROI analysis
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projections Table */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>5-Year Projections</CardTitle>
            <CardDescription>
              Based on {inputs.annualAppreciation}% annual appreciation and 2%
              rent increase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 text-left font-medium">Year</th>
                    <th className="py-2 text-right font-medium">Property Value</th>
                    <th className="py-2 text-right font-medium">Cumulative Cash Flow</th>
                    <th className="py-2 text-right font-medium">Total Return</th>
                    <th className="py-2 text-right font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {results.projectedValues.map((proj) => (
                    <ProjectionRow key={proj.year} {...proj} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted p-3">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Projections are estimates based on your inputs. Actual returns
                may vary based on market conditions, maintenance costs, and
                other factors.
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

export { ROICalculator }
