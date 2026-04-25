/**
 * ROI Calculator Component
 * Calculates rental investment returns, investment grade, and 10-year projections
 */

import { Link } from "@tanstack/react-router"
import {
  ArrowRight,
  ChevronDown,
  Download,
  Euro,
  ExternalLink,
  Globe,
  Info,
  Lightbulb,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
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
import {
  useDeleteROICalculation,
  useSaveROICalculation,
} from "@/hooks/mutations/useCalculatorMutations"
import {
  useRentEstimate,
  useUserROICalculations,
} from "@/hooks/queries/useCalculatorQueries"
import { isLoggedIn } from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import type {
  ROICalculationInput,
  ROICalculationSummary,
} from "@/models/calculator"
import { handleError } from "@/utils"
import { FormRow } from "./common/FormRow"
import { MetricCard } from "./common/MetricCard"
import { SaveShareSection } from "./common/SaveShareSection"

interface IProps {
  className?: string
  initialMonthlyRent?: number
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

  // Investment grade
  investmentGrade: number
  investmentGradeLabel: string

  // After-tax figures
  annualDepreciation: number
  annualInterestYr1: number
  taxablePropertyIncome: number
  annualTaxEffect: number
  annualCashFlowAfterTax: number
  cashOnCashReturnAfterTax: number

  // Projections (10-year)
  projectedValues: {
    year: number
    propertyValue: number
    equity: number
    cumulativeCashFlow: number
    cumulativeCashFlowAfterTax: number
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
  postcode: string
  propertySizeSqm: string
  marginalTaxRate: string
  buildingSharePercent: string
  depreciationRate: string
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const CURRENCY_PER_SQM_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

const PERCENT_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

const GRADE_COLORS: Record<string, string> = {
  Excellent:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Good: "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400",
  Moderate:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Poor: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "Very Poor": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

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
  termYears: number,
): number {
  if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0

  const monthlyRate = annualRate / 100 / 12
  const numPayments = termYears * 12

  return (
    (principal * monthlyRate * (1 + monthlyRate) ** numPayments) /
    ((1 + monthlyRate) ** numPayments - 1)
  )
}

/** Score gross yield on 0-10 scale. */
function scoreGrossYield(pct: number): number {
  if (pct >= 8) return 10
  if (pct >= 6) return 8
  if (pct >= 4) return 6
  if (pct >= 2) return 3
  return 0
}

/** Score cap rate on 0-10 scale. */
function scoreCapRate(pct: number): number {
  if (pct >= 7) return 10
  if (pct >= 5) return 7
  if (pct >= 3) return 4
  return 0
}

/** Score cash-on-cash return on 0-10 scale. */
function scoreCashOnCash(pct: number): number {
  if (pct >= 15) return 10
  if (pct >= 10) return 8
  if (pct >= 5) return 6
  if (pct >= 0) return 3
  return 0
}

/** Score cash flow positivity on 0-10 scale. */
function scoreCashFlow(annualCashFlow: number): number {
  if (annualCashFlow > 0) return 10
  if (annualCashFlow === 0) return 5
  return 0
}

/** Score vacancy buffer on 0-10 scale. */
function scoreVacancy(vacancyPct: number): number {
  if (vacancyPct < 5) return 10
  if (vacancyPct <= 15) return 6
  return 2
}

/** Map grade number to label. */
function gradeLabel(grade: number): string {
  if (grade >= 8) return "Excellent"
  if (grade >= 6) return "Good"
  if (grade >= 4) return "Moderate"
  if (grade >= 2) return "Poor"
  return "Very Poor"
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
  const marginalTaxRate = parseNumber(inputs.marginalTaxRate) / 100
  const buildingShare = parseNumber(inputs.buildingSharePercent) / 100
  const depreciationRate = parseNumber(inputs.depreciationRate) / 100

  if (purchasePrice <= 0 || monthlyRent <= 0) return null

  // Financing
  const loanAmount = purchasePrice - downPayment
  const monthlyMortgage = calculateMortgagePayment(
    loanAmount,
    mortgageRate,
    mortgageTerm,
  )
  const monthlyRate = mortgageRate / 100 / 12

  // Annual income
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

  // Investment grade (weighted 0-10)
  const grossYieldPct = grossYield * 100
  const capRatePct = capRate * 100
  const cocPct = cashOnCashReturn * 100
  const vacancyPct = parseNumber(inputs.vacancyRate)

  const investmentGrade =
    Math.round(
      (scoreGrossYield(grossYieldPct) * 0.25 +
        scoreCapRate(capRatePct) * 0.25 +
        scoreCashOnCash(cocPct) * 0.25 +
        scoreCashFlow(annualCashFlow) * 0.15 +
        scoreVacancy(vacancyPct) * 0.1) *
        10,
    ) / 10

  const investmentGradeLabel = gradeLabel(investmentGrade)

  // Tax calculations — depreciation (AfA)
  const annualDepreciation = purchasePrice * buildingShare * depreciationRate

  // Year-1 interest (track from mortgage amortisation)
  let annualInterestYr1 = 0
  let tempBalance = loanAmount
  for (let m = 0; m < 12; m++) {
    if (tempBalance <= 0 || monthlyRate <= 0) break
    const interest = tempBalance * monthlyRate
    annualInterestYr1 += interest
    const principal = monthlyMortgage - interest
    tempBalance = Math.max(0, tempBalance - principal)
  }

  // Taxable property income = NOI - mortgage interest - depreciation
  const taxablePropertyIncome =
    netOperatingIncome - annualInterestYr1 - annualDepreciation

  // Tax effect: positive = benefit (reduces other income tax), negative = tax due
  const annualTaxEffect =
    taxablePropertyIncome < 0
      ? Math.abs(taxablePropertyIncome) * marginalTaxRate
      : -taxablePropertyIncome * marginalTaxRate

  const annualCashFlowAfterTax = annualCashFlow + annualTaxEffect
  const cashOnCashReturnAfterTax =
    downPayment > 0 ? annualCashFlowAfterTax / downPayment : 0

  // 10-year projections with equity and after-tax tracking
  const projectedValues = []
  let cumulativeCashFlow = 0
  let cumulativeCashFlowAfterTax = 0
  let remainingBalance = loanAmount

  for (let year = 1; year <= 10; year++) {
    const propertyValue = purchasePrice * (1 + annualAppreciation) ** year

    // Track mortgage principal paydown and annual interest
    let yearInterest = 0
    for (let m = 0; m < 12; m++) {
      if (remainingBalance <= 0 || monthlyRate <= 0) break
      const interestPayment = remainingBalance * monthlyRate
      yearInterest += interestPayment
      const principalPayment = monthlyMortgage - interestPayment
      remainingBalance = Math.max(0, remainingBalance - principalPayment)
    }

    const equity = propertyValue - remainingBalance

    // Pre-tax cash flow with 2% annual rent increase
    const yearCashFlow = annualCashFlow * 1.02 ** (year - 1)
    cumulativeCashFlow += yearCashFlow

    // After-tax: recalculate per year (interest decreases as principal pays down)
    const yearNOI = netOperatingIncome * 1.02 ** (year - 1)
    const yearTaxableIncome = yearNOI - yearInterest - annualDepreciation
    const yearTaxEffect =
      yearTaxableIncome < 0
        ? Math.abs(yearTaxableIncome) * marginalTaxRate
        : -yearTaxableIncome * marginalTaxRate
    const yearCashFlowAfterTax = yearCashFlow + yearTaxEffect
    cumulativeCashFlowAfterTax += yearCashFlowAfterTax

    const appreciation = propertyValue - purchasePrice
    const totalReturn = appreciation + cumulativeCashFlow
    const totalReturnPercent = downPayment > 0 ? totalReturn / downPayment : 0

    projectedValues.push({
      year,
      propertyValue,
      equity,
      cumulativeCashFlow,
      cumulativeCashFlowAfterTax,
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
    investmentGrade,
    investmentGradeLabel,
    annualDepreciation,
    annualInterestYr1,
    taxablePropertyIncome,
    annualTaxEffect,
    annualCashFlowAfterTax,
    cashOnCashReturnAfterTax,
    projectedValues,
  }
}

/******************************************************************************
                              Components
******************************************************************************/

/** Investment grade badge. */
function GradeBadge(props: {
  grade: number
  label: string
  size?: "sm" | "md"
}) {
  const { grade, label, size = "md" } = props
  const colorClass = GRADE_COLORS[label] || GRADE_COLORS.Moderate

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        colorClass,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
    >
      {grade.toFixed(1)}/10 {label}
    </span>
  )
}

/** Projection row. */
function ProjectionRow(props: {
  year: number
  propertyValue: number
  equity: number
  cumulativeCashFlow: number
  cumulativeCashFlowAfterTax: number
  totalReturn: number
  totalReturnPercent: number
}) {
  const {
    year,
    propertyValue,
    equity,
    cumulativeCashFlow,
    cumulativeCashFlowAfterTax,
    totalReturn,
    totalReturnPercent,
  } = props

  return (
    <tr className="border-b">
      <td className="py-2 font-medium">Year {year}</td>
      <td className="py-2 text-right">
        {CURRENCY_FORMATTER.format(propertyValue)}
      </td>
      <td className="py-2 text-right">{CURRENCY_FORMATTER.format(equity)}</td>
      <td className="py-2 text-right">
        {CURRENCY_FORMATTER.format(cumulativeCashFlow)}
      </td>
      <td className="py-2 text-right">
        {CURRENCY_FORMATTER.format(cumulativeCashFlowAfterTax)}
      </td>
      <td className="py-2 text-right">
        {CURRENCY_FORMATTER.format(totalReturn)}
      </td>
      <td className="py-2 text-right font-medium text-green-600">
        {PERCENT_FORMATTER.format(totalReturnPercent)}
      </td>
    </tr>
  )
}

/** 10-year projection area chart. */
function ProjectionChart(props: {
  projections: ROIResults["projectedValues"]
}) {
  const { projections } = props

  const chartData = useMemo(
    () =>
      projections.map((p) => ({
        name: `Yr ${p.year}`,
        propertyValue: Math.round(p.propertyValue),
        equity: Math.round(p.equity),
        cumulativeCashFlow: Math.round(p.cumulativeCashFlow),
      })),
    [projections],
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
                ? `${(v / 1_000).toFixed(0)}k`
                : `${v}`
          }
        />
        <Tooltip
          formatter={(value, name) => {
            const label =
              name === "propertyValue"
                ? "Property Value"
                : name === "equity"
                  ? "Equity"
                  : "Cumulative Cash Flow"
            return [CURRENCY_FORMATTER.format(Number(value)), label]
          }}
          labelFormatter={(label) => String(label)}
        />
        <Area
          type="monotone"
          dataKey="propertyValue"
          name="propertyValue"
          stroke={Colors.Chart.Blue}
          fill={Colors.Chart.Blue}
          fillOpacity={0.1}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="equity"
          name="equity"
          stroke={Colors.Chart.Green}
          fill={Colors.Chart.Green}
          fillOpacity={0.1}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="cumulativeCashFlow"
          name="cumulativeCashFlow"
          stroke={Colors.Chart.Amber}
          fill={Colors.Chart.Amber}
          fillOpacity={0.1}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Saved ROI calculations list. */
function SavedROICalculations(props: {
  calculations: ROICalculationSummary[]
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const { calculations, onDelete, isDeleting } = props

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Saved ROI Calculations</CardTitle>
        <CardDescription>Your previously saved ROI analyses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {calculations.map((calc) => (
            <div
              key={calc.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">
                    {calc.name || CURRENCY_FORMATTER.format(calc.purchasePrice)}
                  </p>
                  <GradeBadge
                    grade={calc.investmentGrade}
                    label={calc.investmentGradeLabel}
                    size="sm"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Cash Flow: {CURRENCY_FORMATTER.format(calc.annualCashFlow)}/yr
                  {" · "}
                  {new Date(calc.createdAt).toLocaleDateString("de-DE")}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {calc.shareId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/calculators?roiShare=${calc.shareId}`
                      navigator.clipboard.writeText(url)
                    }}
                    title="Copy share link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(calc.id)}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Default component. ROI calculator. */
function ROICalculator(props: Readonly<IProps>) {
  const { className, initialMonthlyRent } = props

  // initialMonthlyRent is intentionally a one-time seed: it pre-fills the
  // field on first mount (e.g. from the Rent Estimate CTA) but subsequent
  // prop changes do not update state — the user owns the field after that.
  const [inputs, setInputs] = useState<CalculatorInputs>({
    purchasePrice: "",
    downPayment: "",
    monthlyRent: initialMonthlyRent
      ? String(Math.round(initialMonthlyRent))
      : "",
    monthlyExpenses: "",
    annualAppreciation: "2",
    vacancyRate: "5",
    mortgageRate: "4",
    mortgageTerm: "25",
    postcode: "",
    propertySizeSqm: "",
    marginalTaxRate: "42",
    buildingSharePercent: "70",
    depreciationRate: "2",
  })

  const [saveName, setSaveName] = useState("")
  const [shareUrl, setShareUrl] = useState("")
  const [showTaxSettings, setShowTaxSettings] = useState(false)

  const authenticated = isLoggedIn()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const saveROI = useSaveROICalculation()
  const deleteROI = useDeleteROICalculation()
  const { data: savedCalcs } = useUserROICalculations()

  const parsedSize = parseNumber(inputs.propertySizeSqm)
  const sizeSqm = parsedSize > 0 ? parsedSize : undefined
  const { data: rentEstimate, isFetching: isEstimating } = useRentEstimate(
    inputs.postcode,
    sizeSqm,
  )

  const results = useMemo(() => calculateROI(inputs), [inputs])

  const updateInput = (key: keyof CalculatorInputs, value: string) => {
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
    setInputs({
      purchasePrice: "",
      downPayment: "",
      monthlyRent: "",
      monthlyExpenses: "",
      annualAppreciation: "2",
      vacancyRate: "5",
      mortgageRate: "4",
      mortgageTerm: "25",
      postcode: "",
      propertySizeSqm: "",
      marginalTaxRate: "42",
      buildingSharePercent: "70",
      depreciationRate: "2",
    })
    setShareUrl("")
  }

  const handleSuggestRent = () => {
    if (!rentEstimate?.monthlyRent) return
    updateInput("monthlyRent", String(rentEstimate.monthlyRent))
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

  const handleSave = () => {
    if (!results) return
    const input: ROICalculationInput = {
      name: saveName || undefined,
      purchasePrice: parseNumber(inputs.purchasePrice),
      downPayment: parseNumber(inputs.downPayment),
      monthlyRent: parseNumber(inputs.monthlyRent),
      monthlyExpenses: parseNumber(inputs.monthlyExpenses),
      annualAppreciation: parseNumber(inputs.annualAppreciation),
      vacancyRate: parseNumber(inputs.vacancyRate),
      mortgageRate: parseNumber(inputs.mortgageRate),
      mortgageTerm: parseNumber(inputs.mortgageTerm),
    }
    saveROI.mutate(input, {
      onSuccess: (saved) => {
        setSaveName("")
        showSuccessToast("ROI calculation saved")
        if (saved.shareId) {
          const url = `${window.location.origin}/calculators?roiShare=${saved.shareId}`
          setShareUrl(url)
        }
      },
      onError: handleError.bind(showErrorToast),
    })
  }

  const handleCopyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      showSuccessToast("Share link copied to clipboard")
    }
  }

  const handleDelete = (id: string) => {
    deleteROI.mutate(id, {
      onSuccess: () => showSuccessToast("ROI calculation deleted"),
    })
  }

  const getCashFlowVariant = (value: number) => {
    if (value > 0) return "success" as const
    if (value < 0) return "danger" as const
    return "default" as const
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
              <FormRow htmlFor="purchasePrice" label="Purchase Price">
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="purchasePrice"
                    type="text"
                    inputMode="numeric"
                    placeholder="500,000"
                    value={
                      inputs.purchasePrice
                        ? parseInt(inputs.purchasePrice, 10).toLocaleString(
                            "de-DE",
                          )
                        : ""
                    }
                    onChange={(e) => handlePriceInput("purchasePrice", e)}
                    className="pl-9"
                  />
                </div>
              </FormRow>
              <FormRow htmlFor="downPayment" label="Down Payment">
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="downPayment"
                    type="text"
                    inputMode="numeric"
                    placeholder="100,000"
                    value={
                      inputs.downPayment
                        ? parseInt(inputs.downPayment, 10).toLocaleString(
                            "de-DE",
                          )
                        : ""
                    }
                    onChange={(e) => handlePriceInput("downPayment", e)}
                    className="pl-9"
                  />
                </div>
              </FormRow>
            </div>

            {/* Rental Income */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Rental Income
              </h4>
              <FormRow htmlFor="postcode" label="Postcode" optional>
                <Input
                  id="postcode"
                  type="text"
                  inputMode="numeric"
                  placeholder="10115"
                  maxLength={5}
                  value={inputs.postcode}
                  onChange={(e) =>
                    updateInput(
                      "postcode",
                      e.target.value.replace(/[^\d]/g, ""),
                    )
                  }
                />
              </FormRow>
              <FormRow
                htmlFor="propertySizeSqm"
                label="Property Size (m²)"
                optional
              >
                <Input
                  id="propertySizeSqm"
                  type="text"
                  inputMode="numeric"
                  placeholder="75"
                  value={inputs.propertySizeSqm}
                  onChange={(e) =>
                    updateInput(
                      "propertySizeSqm",
                      e.target.value.replace(/[^\d]/g, ""),
                    )
                  }
                />
              </FormRow>
              <FormRow htmlFor="monthlyRent" label="Monthly Rent">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="monthlyRent"
                      type="text"
                      inputMode="numeric"
                      placeholder="1,500"
                      value={
                        inputs.monthlyRent
                          ? parseInt(inputs.monthlyRent, 10).toLocaleString(
                              "de-DE",
                            )
                          : ""
                      }
                      onChange={(e) => handlePriceInput("monthlyRent", e)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={!rentEstimate?.monthlyRent || isEstimating}
                    onClick={handleSuggestRent}
                    title="Suggest rent based on postcode and size"
                  >
                    <Lightbulb className="h-4 w-4" />
                    <span className="hidden sm:inline">Suggest</span>
                  </Button>
                </div>
                {rentEstimate?.estimatedRentPerSqm != null && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {rentEstimate.source}:{" "}
                    {CURRENCY_PER_SQM_FORMATTER.format(
                      rentEstimate.estimatedRentPerSqm,
                    )}
                    /m²
                    {rentEstimate.rentRange && (
                      <span>
                        {" "}
                        (range{" "}
                        {CURRENCY_PER_SQM_FORMATTER.format(
                          rentEstimate.rentRange.min,
                        )}
                        –
                        {CURRENCY_PER_SQM_FORMATTER.format(
                          rentEstimate.rentRange.max,
                        )}
                        /m²)
                      </span>
                    )}
                    {rentEstimate.confidence === "high" && (
                      <span className="ml-1 rounded bg-green-100 px-1 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        High confidence
                      </span>
                    )}
                  </p>
                )}
              </FormRow>
              <FormRow htmlFor="monthlyExpenses" label="Monthly Expenses">
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="monthlyExpenses"
                    type="text"
                    inputMode="numeric"
                    placeholder="300"
                    value={
                      inputs.monthlyExpenses
                        ? parseInt(inputs.monthlyExpenses, 10).toLocaleString(
                            "de-DE",
                          )
                        : ""
                    }
                    onChange={(e) => handlePriceInput("monthlyExpenses", e)}
                    className="pl-9"
                  />
                </div>
              </FormRow>
            </div>

            {/* Assumptions */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Assumptions
              </h4>
              <FormRow htmlFor="vacancyRate" label="Vacancy Rate (%)">
                <Input
                  id="vacancyRate"
                  type="number"
                  min="0"
                  max="100"
                  value={inputs.vacancyRate}
                  onChange={(e) => updateInput("vacancyRate", e.target.value)}
                />
              </FormRow>
              <FormRow
                htmlFor="annualAppreciation"
                label="Annual Appreciation (%)"
              >
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
              </FormRow>
              <FormRow htmlFor="mortgageRate" label="Mortgage Rate (%)">
                <Input
                  id="mortgageRate"
                  type="number"
                  min="0"
                  max="15"
                  step="0.1"
                  value={inputs.mortgageRate}
                  onChange={(e) => updateInput("mortgageRate", e.target.value)}
                />
              </FormRow>
              <FormRow htmlFor="mortgageTerm" label="Mortgage Term (years)">
                <Input
                  id="mortgageTerm"
                  type="number"
                  min="5"
                  max="40"
                  value={inputs.mortgageTerm}
                  onChange={(e) => updateInput("mortgageTerm", e.target.value)}
                />
              </FormRow>
            </div>

            {/* Tax Settings (collapsible) */}
            <div className="space-y-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowTaxSettings((prev) => !prev)}
              >
                <span>Tax Settings (German Income Tax)</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showTaxSettings && "rotate-180",
                  )}
                />
              </button>
              {showTaxSettings && (
                <div className="space-y-4 rounded-lg border border-dashed p-4">
                  <p className="text-xs text-muted-foreground">
                    Rental income in Germany is taxed at your marginal rate.
                    Mortgage interest and building depreciation (AfA) are
                    deductible, which can create a tax benefit in early years.
                  </p>
                  <FormRow
                    htmlFor="marginalTaxRate"
                    label="Marginal Tax Rate (%)"
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
                  <FormRow
                    htmlFor="buildingSharePercent"
                    label="Building Share (%)"
                  >
                    <Input
                      id="buildingSharePercent"
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={inputs.buildingSharePercent}
                      onChange={(e) =>
                        updateInput("buildingSharePercent", e.target.value)
                      }
                    />
                  </FormRow>
                  <FormRow
                    htmlFor="depreciationRate"
                    label="Depreciation Rate (%)"
                  >
                    <Input
                      id="depreciationRate"
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={inputs.depreciationRate}
                      onChange={(e) =>
                        updateInput("depreciationRate", e.target.value)
                      }
                    />
                  </FormRow>
                </div>
              )}
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Investment Analysis</CardTitle>
                <CardDescription>Key metrics and returns</CardDescription>
              </div>
              {results && (
                <GradeBadge
                  grade={results.investmentGrade}
                  label={results.investmentGradeLabel}
                />
              )}
            </div>
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
                    description="Pre-tax · annual CF / down payment"
                    variant={getCashFlowVariant(results.cashOnCashReturn)}
                  />
                  <MetricCard
                    label="Annual Cash Flow"
                    value={CURRENCY_FORMATTER.format(results.annualCashFlow)}
                    description="Pre-tax · after mortgage payments"
                    variant={getCashFlowVariant(results.annualCashFlow)}
                  />
                  <MetricCard
                    label="After-Tax Cash-on-Cash"
                    value={PERCENT_FORMATTER.format(
                      results.cashOnCashReturnAfterTax,
                    )}
                    description="After-tax CF / down payment"
                    variant={getCashFlowVariant(
                      results.cashOnCashReturnAfterTax,
                    )}
                  />
                  <MetricCard
                    label="After-Tax Cash Flow"
                    value={CURRENCY_FORMATTER.format(
                      results.annualCashFlowAfterTax,
                    )}
                    description="After mortgage, depreciation & tax"
                    variant={getCashFlowVariant(results.annualCashFlowAfterTax)}
                  />
                </div>

                <Separator />

                {/* Income Summary */}
                <div className="space-y-2">
                  <h4 className="font-medium">Annual Summary</h4>
                  <div className="rounded-lg border p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Gross Rental Income</span>
                      <span>
                        {CURRENCY_FORMATTER.format(results.grossRentalIncome)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>- Operating Expenses</span>
                      <span>
                        {CURRENCY_FORMATTER.format(
                          results.grossRentalIncome -
                            results.netOperatingIncome,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Net Operating Income (NOI)</span>
                      <span>
                        {CURRENCY_FORMATTER.format(results.netOperatingIncome)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tax Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-medium">Tax Impact (Year 1)</h4>
                  <div className="rounded-lg border p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>- Mortgage Interest (deductible)</span>
                      <span>
                        {CURRENCY_FORMATTER.format(results.annualInterestYr1)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>- Depreciation (AfA)</span>
                      <span>
                        {CURRENCY_FORMATTER.format(results.annualDepreciation)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>Taxable Property Income</span>
                      <span
                        className={
                          results.taxablePropertyIncome < 0
                            ? "text-green-600"
                            : ""
                        }
                      >
                        {CURRENCY_FORMATTER.format(
                          results.taxablePropertyIncome,
                        )}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex justify-between font-medium",
                        results.annualTaxEffect > 0
                          ? "text-green-600"
                          : results.annualTaxEffect < 0
                            ? "text-red-600"
                            : "",
                      )}
                    >
                      <span>
                        {results.annualTaxEffect > 0
                          ? "Tax Benefit"
                          : results.annualTaxEffect < 0
                            ? "Tax Due"
                            : "Tax Effect"}
                      </span>
                      <span>
                        {results.annualTaxEffect > 0 ? "+" : ""}
                        {CURRENCY_FORMATTER.format(results.annualTaxEffect)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>After-Tax Cash Flow</span>
                      <span
                        className={
                          results.annualCashFlowAfterTax >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {CURRENCY_FORMATTER.format(
                          results.annualCashFlowAfterTax,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cross-Border Tax Guide Link */}
                <div className="rounded-lg border border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20 p-4">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Investing from abroad?
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mb-2">
                    See how your home country&apos;s tax treaty with Germany
                    affects your returns.
                  </p>
                  <Link
                    to="/calculators"
                    search={{ tab: "tax-guide" }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                  >
                    View Cross-Border Tax Guide
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Results
                </Button>

                {/* Save / Share or Sign-Up CTA */}
                <SaveShareSection
                  saveName={saveName}
                  onSaveNameChange={setSaveName}
                  onSave={handleSave}
                  isSaving={saveROI.isPending}
                  shareUrl={shareUrl}
                  onCopyShareUrl={handleCopyShareUrl}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Enter a{" "}
                  <span className="font-medium text-foreground">
                    Purchase Price
                  </span>{" "}
                  and{" "}
                  <span className="font-medium text-foreground">
                    Monthly Rent
                  </span>{" "}
                  to see your investment analysis
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Results update automatically as you type
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projections Chart & Table */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>10-Year Projections</CardTitle>
            <CardDescription>
              Based on {inputs.annualAppreciation}% annual appreciation and 2%
              rent increase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Chart */}
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                  Property Value
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                  Equity
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Cumulative Cash Flow
                </span>
              </div>
              <ProjectionChart projections={results.projectedValues} />
            </div>

            <Separator />

            {/* Details Table */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                Detailed Breakdown
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 text-left font-medium">Year</th>
                      <th className="py-2 text-right font-medium">
                        Property Value
                      </th>
                      <th className="py-2 text-right font-medium">Equity</th>
                      <th className="py-2 text-right font-medium">Cumul. CF</th>
                      <th className="py-2 text-right font-medium">
                        Cumul. CF (After Tax)
                      </th>
                      <th className="py-2 text-right font-medium">
                        Total Return
                      </th>
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
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
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

      {/* Saved Calculations */}
      {authenticated && savedCalcs && savedCalcs.data.length > 0 && (
        <SavedROICalculations
          calculations={savedCalcs.data}
          onDelete={handleDelete}
          isDeleting={deleteROI.isPending}
        />
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { ROICalculator }
