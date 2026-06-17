/**
 * Interactive mortgage affordability calculator for foreign buyers.
 * Pure client-side computation — no API calls required.
 */

import { AlertTriangle, Calculator, CheckCircle2, Copy } from "lucide-react"
import { useState } from "react"
import { formatEur } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"

/******************************************************************************
                              Constants
******************************************************************************/

const ANNUAL_RATE = 0.038 // Typical fixed rate, Apr 2026
const LOAN_MONTHS = 300 // 25-year standard term
const CLOSING_COST_RATE = 0.11 // Grunderwerbsteuer + notary + agent
const DTI_LIMIT = 0.35 // German banks: max 35% gross income to debt

// Conservative midpoint LTV values per residency; full ranges shown in the
// eligibility guide above (RESIDENCY_PROFILES in mortgage-guide.tsx).
const LTV_BY_RESIDENCY: Record<string, number> = {
  "german-citizen": 0.8,
  "eu-eea": 0.75,
  "non-eu-resident": 0.65,
  "non-resident": 0.55,
}

const RESIDENCY_OPTIONS = [
  { value: "german-citizen", label: "German Citizen — 80% LTV" },
  { value: "eu-eea", label: "EU / EEA Citizen — 75% LTV" },
  { value: "non-eu-resident", label: "Non-EU Resident in Germany — 65% LTV" },
  { value: "non-resident", label: "Non-Resident Foreign Buyer — 55% LTV" },
]

const VERDICT_CONFIG = {
  green: {
    Icon: CheckCircle2,
    colorClass: "text-green-600",
    bgClass: "bg-green-50 dark:bg-green-950/30",
    borderClass: "border-green-200 dark:border-green-900",
    label: "Comfortably affordable",
  },
  amber: {
    Icon: AlertTriangle,
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    borderClass: "border-amber-200 dark:border-amber-900",
    label: "Borderline — proceed with caution",
  },
} as const

/******************************************************************************
                              Pure helpers
******************************************************************************/

function annuityPayment(principal: number): number {
  const r = ANNUAL_RATE / 12
  const factor = (1 + r) ** LOAN_MONTHS
  return (principal * r * factor) / (factor - 1)
}

function maxLoanFromIncome(grossAnnual: number): number {
  const monthlyCapacity = (grossAnnual / 12) * DTI_LIMIT
  const r = ANNUAL_RATE / 12
  const factor = (1 + r) ** LOAN_MONTHS
  return (monthlyCapacity * (factor - 1)) / (r * factor)
}

// Strips locale thousands separators (spaces, commas) before parsing.
// Preserves the decimal point — consistent with other calculator parsers.
function parsePosFloat(raw: string): number {
  const n = parseFloat(raw.replace(/[^\d.]/g, ""))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/******************************************************************************
                              Types
******************************************************************************/

interface IFormState {
  income: string
  partnerIncome: string
  showPartner: boolean
  equity: string
  residency: string
  targetPrice: string
}

interface IResult {
  maxLoan: number
  maxProperty: number
  monthlyPayment: number
  verdict: "green" | "amber"
  // true when income caps the loan — equity increase won't help
  isIncomeBound: boolean
  // null = target affordable; "equity" = savings gap; "income" = DTI exceeded;
  // "both" = equity gap AND income insufficient (both constraints violated)
  targetBlocker: "equity" | "income" | "both" | null
  targetGap: number
}

/******************************************************************************
                              Calculation
******************************************************************************/

function computeResult(form: IFormState): IResult | null {
  const ltv = LTV_BY_RESIDENCY[form.residency]
  if (!ltv) return null // residency not selected yet

  const income = parsePosFloat(form.income)
  const partner = form.showPartner ? parsePosFloat(form.partnerIncome) : 0
  const totalIncome = income + partner
  const equity = parsePosFloat(form.equity)
  const target = parsePosFloat(form.targetPrice)

  if (totalIncome <= 0 || equity <= 0) return null

  // Equity constraint: savings must cover down payment + closing costs
  const downPaymentRate = 1 - ltv + CLOSING_COST_RATE
  const maxPropFromEquity = equity / downPaymentRate
  // Income constraint: monthly payment must stay within DTI limit
  const maxPropFromIncome = maxLoanFromIncome(totalIncome) / ltv

  const isIncomeBound = maxPropFromIncome <= maxPropFromEquity
  const maxProperty = Math.min(maxPropFromEquity, maxPropFromIncome)
  const maxLoan = maxProperty * ltv
  const monthlyPayment = annuityPayment(maxLoan)
  const dti = monthlyPayment / (totalIncome / 12)

  const verdict = dti <= 0.3 ? "green" : "amber"

  // Target price analysis — surface all active constraints independently
  let targetBlocker: IResult["targetBlocker"] = null
  let targetGap = 0
  if (target > 0) {
    const neededEquity = target * downPaymentRate
    const incomeOk =
      annuityPayment(target * ltv) <= (totalIncome / 12) * DTI_LIMIT
    targetGap = Math.max(0, neededEquity - equity)
    const equityShort = targetGap > 0
    if (equityShort && !incomeOk) {
      targetBlocker = "both"
    } else if (equityShort) {
      targetBlocker = "equity"
    } else if (!incomeOk) {
      targetBlocker = "income"
    }
  }

  return {
    maxLoan,
    maxProperty,
    monthlyPayment,
    verdict,
    isIncomeBound,
    targetBlocker,
    targetGap,
  }
}

/******************************************************************************
                              Components
******************************************************************************/

interface IAffordabilityFormProps {
  form: IFormState
  onChange: (patch: Partial<IFormState>) => void
}

function AffordabilityForm({
  form,
  onChange,
}: Readonly<IAffordabilityFormProps>) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="calc-residency">Residency status</Label>
        <Select
          value={form.residency}
          onValueChange={(v) => onChange({ residency: v })}
        >
          <SelectTrigger id="calc-residency">
            <SelectValue placeholder="Select your residency status" />
          </SelectTrigger>
          <SelectContent>
            {RESIDENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Conservative midpoint values — actual bank offers may vary. See the
          eligibility guide above for full LTV ranges.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="calc-income">Your gross annual income (€)</Label>
        <Input
          id="calc-income"
          type="number"
          min={0}
          placeholder="e.g. 80000"
          value={form.income}
          onChange={(e) => onChange({ income: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={form.showPartner}
            onChange={(e) => onChange({ showPartner: e.target.checked })}
          />
          Include partner / co-borrower income
        </label>
        {form.showPartner && (
          <div className="space-y-1.5 pl-6">
            <Label htmlFor="calc-partner">
              Partner gross annual income (€)
            </Label>
            <Input
              id="calc-partner"
              type="number"
              min={0}
              placeholder="e.g. 60000"
              value={form.partnerIncome}
              onChange={(e) => onChange({ partnerIncome: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="calc-equity">Available equity / savings (€)</Label>
        <Input
          id="calc-equity"
          type="number"
          min={0}
          placeholder="e.g. 120000"
          value={form.equity}
          onChange={(e) => onChange({ equity: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Must cover the down payment plus ~11% closing costs
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="calc-target">
          Target property price (€){" "}
          <span className="font-normal text-muted-foreground">— optional</span>
        </Label>
        <Input
          id="calc-target"
          type="number"
          min={0}
          placeholder="e.g. 450000"
          value={form.targetPrice}
          onChange={(e) => onChange({ targetPrice: e.target.value })}
        />
      </div>
    </div>
  )
}

interface IAffordabilityResultProps {
  result: IResult
  hasTarget: boolean
}

function AffordabilityResult({
  result,
  hasTarget,
}: Readonly<IAffordabilityResultProps>) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const config = VERDICT_CONFIG[result.verdict]
  const { Icon } = config

  async function handleCopy() {
    const lines = [
      "Mortgage Affordability Estimate — HeimPath",
      `Max property price: ${formatEur(result.maxProperty)}`,
      `Max loan amount:    ${formatEur(result.maxLoan)}`,
      `Est. monthly payment: ${formatEur(result.monthlyPayment)} (3.8% p.a., 25 yrs)`,
      `Verdict: ${config.label}`,
    ]
    if (hasTarget && result.targetBlocker !== null) {
      if (
        result.targetBlocker === "equity" ||
        result.targetBlocker === "both"
      ) {
        lines.push(
          `Target: extra equity needed: ${formatEur(result.targetGap)}`,
        )
      }
      if (
        result.targetBlocker === "income" ||
        result.targetBlocker === "both"
      ) {
        lines.push("Target: monthly repayment would exceed 35% income limit")
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      showSuccessToast("Estimate copied to clipboard")
    } catch {
      showErrorToast("Could not copy to clipboard")
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border p-4 ${config.bgClass} ${config.borderClass}`}
      >
        <div
          className={`flex items-center gap-2 font-semibold ${config.colorClass}`}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {config.label}
        </div>
        {result.isIncomeBound && (
          <p className="mt-1 pl-7 text-xs opacity-80">
            Income is your limit — increasing equity won't raise this maximum.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Max property price
          </p>
          <p className="mt-1 text-lg font-bold">
            {formatEur(result.maxProperty)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Max loan amount
          </p>
          <p className="mt-1 text-lg font-bold">{formatEur(result.maxLoan)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Est. monthly payment
          </p>
          <p className="mt-1 text-lg font-bold">
            {formatEur(result.monthlyPayment)}
          </p>
          <p className="text-xs text-muted-foreground">3.8% p.a. · 25 yrs</p>
        </div>
      </div>

      {hasTarget && (
        <div
          className={`rounded-lg border p-4 ${
            result.targetBlocker === null
              ? `${VERDICT_CONFIG.green.bgClass} ${VERDICT_CONFIG.green.borderClass}`
              : `${VERDICT_CONFIG.amber.bgClass} ${VERDICT_CONFIG.amber.borderClass}`
          }`}
        >
          {result.targetBlocker === null ? (
            <p
              className={`flex items-center gap-2 text-sm ${VERDICT_CONFIG.green.colorClass}`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Your target property price is within reach.
            </p>
          ) : (
            <div className={`text-sm ${VERDICT_CONFIG.amber.colorClass}`}>
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {result.targetBlocker === "both"
                  ? "Both equity and income are insufficient for your target"
                  : result.targetBlocker === "income"
                    ? "Income is the limiting factor for your target"
                    : "Additional equity needed for your target"}
              </p>
              {(result.targetBlocker === "equity" ||
                result.targetBlocker === "both") && (
                <p className="mt-1 pl-6">
                  You need approximately{" "}
                  <strong>{formatEur(result.targetGap)}</strong> more in savings
                  to cover the down payment and closing costs.
                </p>
              )}
              {(result.targetBlocker === "income" ||
                result.targetBlocker === "both") && (
                <p className="mt-1 pl-6">
                  The monthly repayment would exceed your 35% income limit.
                  Consider a lower target price or a higher income.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Estimates assume 3.8% fixed rate, 25-year term, 35% DTI limit, and ~11%
        closing costs. Actual lender decisions vary. This is not financial
        advice.
      </p>

      <Button variant="outline" size="sm" onClick={handleCopy}>
        <Copy className="mr-1.5 h-4 w-4" />
        Copy estimate
      </Button>
    </div>
  )
}

/******************************************************************************
                              Main component
******************************************************************************/

const INITIAL_FORM: IFormState = {
  income: "",
  partnerIncome: "",
  showPartner: false,
  equity: "",
  residency: "",
  targetPrice: "",
}

/** Interactive mortgage affordability calculator embedded in the mortgage guide. */
function AffordabilityCalculator() {
  const [form, setForm] = useState<IFormState>(INITIAL_FORM)

  const result = computeResult(form)
  const hasTarget = parsePosFloat(form.targetPrice) > 0

  function handleChange(patch: Partial<IFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-5 w-5" />
          Affordability Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter your financials to estimate how much you can borrow in Germany.
          Results update in real time.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 lg:grid-cols-2">
          <AffordabilityForm form={form} onChange={handleChange} />
          {result ? (
            <AffordabilityResult result={result} hasTarget={hasTarget} />
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Select your residency status and enter your income and equity to
              see your estimate.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default AffordabilityCalculator
