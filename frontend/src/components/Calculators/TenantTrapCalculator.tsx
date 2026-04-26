/**
 * Tenant Trap Stress Test Calculator
 * Models portfolio cash-flow survival if a percentage of tenants stop paying
 */

import { AlertTriangle, Info, RefreshCw, ShieldAlert } from "lucide-react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  numUnits: string
  avgMonthlyRent: string
  avgMonthlyMortgage: string
  monthlyFixedCosts: string
  cashReserves: string
  nonPayingPct: number
  evictionMonths: string
  legalCostPerEviction: string
}

interface StressResults {
  nonPayingUnits: number
  monthlyIncomeLoss: number
  monthlyNetShortfall: number
  totalLegalCosts: number
  monthsBeforeLegal: number
  monthsAfterLegal: number
  recommendedBuffer: number
  bufferCoverageRatio: number
  verdict: "safe" | "warning" | "danger"
  chartData: Array<{ name: string; value: number }>
}

interface IProps {
  className?: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const VERDICT_LABEL: Record<StressResults["verdict"], string> = {
  safe: "Reserves sufficient",
  warning: "At risk — consider increasing reserves",
  danger: "Critical — portfolio may not survive default scenario",
}

const VERDICT_BAR_COLOR: Record<StressResults["verdict"], string> = {
  safe: Colors.Chart.Green,
  warning: Colors.Chart.Amber,
  danger: Colors.Chart.Red,
}

const DEFAULT_INPUTS: CalculatorInputs = {
  numUnits: "",
  avgMonthlyRent: "",
  avgMonthlyMortgage: "",
  monthlyFixedCosts: "",
  cashReserves: "",
  nonPayingPct: 20,
  evictionMonths: "18",
  legalCostPerEviction: "5000",
}

/******************************************************************************
                              Functions
******************************************************************************/

function parseNum(v: string): number {
  return Number.parseFloat(v.replace(/[^\d.]/g, "")) || 0
}

function verdictVariant(
  verdict: StressResults["verdict"],
): "success" | "warning" | "danger" {
  if (verdict === "safe") return "success"
  if (verdict === "warning") return "warning"
  return "danger"
}

function formatMonths(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return "0 months"
  if (months >= 120) return "10+ years"
  const y = Math.floor(months / 12)
  const m = Math.round(months % 12)
  if (y === 0) return `${m} month${m === 1 ? "" : "s"}`
  if (m === 0) return `${y} year${y === 1 ? "" : "s"}`
  return `${y}y ${m}m`
}

/** Calculate tenant-default stress test results. Returns null when required fields are missing. */
function calculateTenantStress(inputs: CalculatorInputs): StressResults | null {
  const numUnits = parseNum(inputs.numUnits)
  const avgMonthlyRent = parseNum(inputs.avgMonthlyRent)
  const avgMonthlyMortgage = parseNum(inputs.avgMonthlyMortgage)
  const monthlyFixedCosts = parseNum(inputs.monthlyFixedCosts)
  const cashReserves = parseNum(inputs.cashReserves)
  const evictionMonths = parseNum(inputs.evictionMonths)
  const legalCostPerEviction = parseNum(inputs.legalCostPerEviction)

  if (!numUnits || !avgMonthlyRent || !cashReserves) return null

  const nonPayingUnits = Math.round(numUnits * (inputs.nonPayingPct / 100))
  const monthlyIncomeLoss = nonPayingUnits * avgMonthlyRent

  // Total monthly outgoings are unchanged — mortgage + fixed costs still owed on all units
  const totalMonthlyOutgoings =
    numUnits * (avgMonthlyMortgage + monthlyFixedCosts)
  const totalMonthlyIncome = numUnits * avgMonthlyRent - monthlyIncomeLoss
  const monthlyNetShortfall = Math.max(
    0,
    totalMonthlyOutgoings - totalMonthlyIncome,
  )

  if (monthlyNetShortfall === 0) {
    // No shortfall — reserves are effectively infinite
    return {
      nonPayingUnits,
      monthlyIncomeLoss: 0,
      monthlyNetShortfall: 0,
      totalLegalCosts: 0,
      monthsBeforeLegal: Infinity,
      monthsAfterLegal: Infinity,
      recommendedBuffer: 0,
      bufferCoverageRatio: Infinity,
      verdict: "safe",
      chartData: [
        { name: "Cash Reserves", value: cashReserves },
        { name: "Recommended Buffer", value: 0 },
      ],
    }
  }

  const totalLegalCosts = nonPayingUnits * legalCostPerEviction
  const monthsBeforeLegal = cashReserves / monthlyNetShortfall
  const monthsAfterLegal = Math.max(
    0,
    (cashReserves - totalLegalCosts) / monthlyNetShortfall,
  )

  // Recommended buffer: survive the full eviction period plus all legal costs
  const recommendedBuffer =
    evictionMonths * monthlyNetShortfall + totalLegalCosts

  const bufferCoverageRatio =
    recommendedBuffer > 0 ? cashReserves / recommendedBuffer : Infinity

  let verdict: StressResults["verdict"]
  if (bufferCoverageRatio >= 1) {
    verdict = "safe"
  } else if (bufferCoverageRatio >= 0.5) {
    verdict = "warning"
  } else {
    verdict = "danger"
  }

  const chartData = [
    { name: "Cash Reserves", value: Math.round(cashReserves) },
    { name: "Recommended Buffer", value: Math.round(recommendedBuffer) },
  ]

  return {
    nonPayingUnits,
    monthlyIncomeLoss,
    monthlyNetShortfall,
    totalLegalCosts,
    monthsBeforeLegal,
    monthsAfterLegal,
    recommendedBuffer,
    bufferCoverageRatio,
    verdict,
    chartData,
  }
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Tenant default stress test calculator. */
function TenantTrapCalculator(props: Readonly<IProps>) {
  const { className } = props
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS)

  const results = useMemo(() => calculateTenantStress(inputs), [inputs])

  function handleChange(field: keyof CalculatorInputs, value: string | number) {
    setInputs((prev) => ({ ...prev, [field]: value }))
  }

  function handleReset() {
    setInputs(DEFAULT_INPUTS)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Tenant Default Stress Test
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Model how long your portfolio survives if a percentage of tenants
            stop paying — German evictions take 18–24 months.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio Details</CardTitle>
            <CardDescription>
              Enter your portfolio and reserve figures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormRow label="Number of units" htmlFor="numUnits" required>
              <Input
                id="numUnits"
                type="number"
                min="1"
                placeholder="e.g. 5"
                value={inputs.numUnits}
                onChange={(e) => handleChange("numUnits", e.target.value)}
              />
            </FormRow>

            <FormRow
              label="Avg monthly rent / unit"
              htmlFor="avgMonthlyRent"
              required
              tooltip="Gross monthly rent collected per unit"
            >
              <Input
                id="avgMonthlyRent"
                type="number"
                min="0"
                placeholder="e.g. 900"
                value={inputs.avgMonthlyRent}
                onChange={(e) => handleChange("avgMonthlyRent", e.target.value)}
              />
            </FormRow>

            <FormRow
              label="Avg mortgage payment / unit"
              htmlFor="avgMonthlyMortgage"
              tooltip="Monthly mortgage instalment per unit (principal + interest)"
            >
              <Input
                id="avgMonthlyMortgage"
                type="number"
                min="0"
                placeholder="e.g. 600"
                value={inputs.avgMonthlyMortgage}
                onChange={(e) =>
                  handleChange("avgMonthlyMortgage", e.target.value)
                }
              />
            </FormRow>

            <FormRow
              label="Other fixed costs / unit"
              htmlFor="monthlyFixedCosts"
              tooltip="Hausgeld, insurance, property tax — per unit per month"
            >
              <Input
                id="monthlyFixedCosts"
                type="number"
                min="0"
                placeholder="e.g. 200"
                value={inputs.monthlyFixedCosts}
                onChange={(e) =>
                  handleChange("monthlyFixedCosts", e.target.value)
                }
              />
            </FormRow>

            <FormRow
              label="Cash reserves / emergency fund"
              htmlFor="cashReserves"
              required
              tooltip="Total liquid reserves available to cover shortfalls"
            >
              <Input
                id="cashReserves"
                type="number"
                min="0"
                placeholder="e.g. 50000"
                value={inputs.cashReserves}
                onChange={(e) => handleChange("cashReserves", e.target.value)}
              />
            </FormRow>

            <Separator />

            <FormRow
              label="Non-paying tenants"
              htmlFor="nonPayingPct"
              tooltip="Percentage of units assumed to stop paying rent"
            >
              <div className="flex items-center gap-3">
                <input
                  id="nonPayingPct"
                  type="range"
                  min={10}
                  max={50}
                  step={5}
                  value={inputs.nonPayingPct}
                  onChange={(e) =>
                    handleChange("nonPayingPct", Number(e.target.value))
                  }
                  className="flex-1 accent-primary"
                />
                <span className="w-12 text-right text-sm font-medium">
                  {inputs.nonPayingPct}%
                </span>
              </div>
            </FormRow>

            <FormRow
              label="Eviction duration (months)"
              htmlFor="evictionMonths"
              tooltip="Typical German eviction: 18–24 months"
            >
              <Input
                id="evictionMonths"
                type="number"
                min="1"
                max="36"
                value={inputs.evictionMonths}
                onChange={(e) => handleChange("evictionMonths", e.target.value)}
              />
            </FormRow>

            <FormRow
              label="Legal cost per eviction"
              htmlFor="legalCostPerEviction"
              tooltip="Solicitor + court fees per eviction, typically €3,000–8,000"
            >
              <Input
                id="legalCostPerEviction"
                type="number"
                min="0"
                value={inputs.legalCostPerEviction}
                onChange={(e) =>
                  handleChange("legalCostPerEviction", e.target.value)
                }
              />
            </FormRow>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {results ? (
            <>
              {/* Verdict */}
              <Alert
                variant={
                  results.verdict === "danger" ? "destructive" : "default"
                }
                className={cn(
                  results.verdict === "safe" &&
                    "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30",
                  results.verdict === "warning" &&
                    "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  {VERDICT_LABEL[results.verdict]}
                  {results.nonPayingUnits > 0 && (
                    <span className="ml-1 font-normal">
                      — {results.nonPayingUnits} unit
                      {results.nonPayingUnits === 1 ? "" : "s"} non-paying at{" "}
                      {inputs.nonPayingPct}%
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="Monthly income loss"
                  value={EUR.format(results.monthlyIncomeLoss)}
                  description={`${results.nonPayingUnits} units × ${EUR.format(parseNum(inputs.avgMonthlyRent))}`}
                  variant={
                    results.monthlyIncomeLoss === 0 ? "success" : "danger"
                  }
                />
                <MetricCard
                  label="Monthly shortfall"
                  value={EUR.format(results.monthlyNetShortfall)}
                  description="After income loss, costs unchanged"
                  variant={
                    results.monthlyNetShortfall === 0 ? "success" : "warning"
                  }
                />
                <MetricCard
                  label="Reserves last (pre-legal)"
                  value={formatMonths(results.monthsBeforeLegal)}
                  description="Without legal costs"
                  variant={verdictVariant(results.verdict)}
                />
                <MetricCard
                  label="Reserves last (post-legal)"
                  value={formatMonths(results.monthsAfterLegal)}
                  description={`After ${EUR.format(results.totalLegalCosts)} legal costs`}
                  variant={verdictVariant(results.verdict)}
                />
              </div>

              <MetricCard
                label="Recommended buffer"
                value={EUR.format(results.recommendedBuffer)}
                description={`${inputs.evictionMonths} months shortfall + legal costs`}
                variant={verdictVariant(results.verdict)}
              />

              {/* Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Reserves vs. Recommended Buffer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={results.chartData}
                      margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                        }
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          EUR.format(Number(value)),
                          "Amount",
                        ]}
                      />
                      <Bar
                        dataKey="value"
                        fill={VERDICT_BAR_COLOR[results.verdict]}
                        radius={[4, 4, 0, 0]}
                      />
                      {results.recommendedBuffer > 0 && (
                        <ReferenceLine
                          y={results.recommendedBuffer}
                          stroke={Colors.Chart.Red}
                          strokeDasharray="4 4"
                          label={{
                            value: "Buffer",
                            position: "right",
                            fontSize: 10,
                          }}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex min-h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Enter portfolio details to run the stress test
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Educational section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            German Eviction Timeline (Räumungsklage)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">
                1. Mahnung (Warning letter)
              </span>{" "}
              — Sent after first missed payment. Tenant given 2 weeks to pay.
            </li>
            <li>
              <span className="font-medium text-foreground">
                2. Kündigung (Notice to quit)
              </span>{" "}
              — After 2 months of arrears, landlord can issue termination. 3
              month notice period.
            </li>
            <li>
              <span className="font-medium text-foreground">
                3. Räumungsklage (Eviction lawsuit)
              </span>{" "}
              — Filed at local court (Amtsgericht). Court proceedings: 6–18
              months depending on Bundesland.
            </li>
            <li>
              <span className="font-medium text-foreground">
                4. Gerichtsvollzieher (Bailiff)
              </span>{" "}
              — Once a judgment is obtained, enforcement can take a further 2–6
              months.
            </li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            Total timeline: typically <strong>18–24 months</strong> from first
            missed payment to vacant possession. During this period, mortgage
            and Hausgeld obligations continue uninterrupted.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Scenario modelling only — actual timelines and costs vary by Bundesland
        and individual circumstances. Consult a Rechtsanwalt (solicitor) for
        specific legal advice.
      </p>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { TenantTrapCalculator }
export default TenantTrapCalculator
