import { Copy, Home, TrendingDown, TrendingUp } from "lucide-react"
import { useState } from "react"
import { GERMAN_STATES } from "@/common/constants"
import { formatEur, parsePosFloat } from "@/common/utils"
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

const NOTARY_AND_REGISTRATION_RATE = 0.02 // ~2% fixed across all states
const DEFAULT_MAINTENANCE_RATE = 0.01 // 1% of property value p.a.
const DEFAULT_STATE = "NI" // Niedersachsen — median Grunderwerbsteuer (5%)
const NO_BREAK_EVEN_HORIZON = 30 // years to search for break-even

const INITIAL_FORM: IFormState = {
  propertyPrice: "",
  monthlyRent: "",
  state: DEFAULT_STATE,
  downPaymentPct: "20",
  mortgageRatePct: "3.8",
  loanTermYears: "25",
  holdingYears: "10",
  appreciationPct: "2.0",
  altReturnPct: "5.0",
  hausgeldMonthly: "200",
}

/******************************************************************************
                              Types
******************************************************************************/

interface IFormState {
  propertyPrice: string
  monthlyRent: string
  state: string
  downPaymentPct: string
  mortgageRatePct: string
  loanTermYears: string
  holdingYears: string
  appreciationPct: string
  altReturnPct: string
  hausgeldMonthly: string
}

interface IResult {
  monthlyBuyingCost: number
  monthlyRentCost: number
  netCostBuying: number
  netCostRenting: number
  breakEvenYear: number | null
  buyingWins: boolean
  savingsAtHorizon: number
  holdingYears: number
}

/******************************************************************************
                              Calculation helpers
******************************************************************************/

function annuityPayment(
  principal: number,
  annualRate: number,
  months: number,
): number {
  if (annualRate < 0.0001) return principal / months
  const r = annualRate / 12
  const f = (1 + r) ** months
  return (principal * r * f) / (f - 1)
}

// Remaining principal after paidMonths of an annuity loan
function loanBalance(
  principal: number,
  annualRate: number,
  totalMonths: number,
  paidMonths: number,
): number {
  if (paidMonths >= totalMonths) return 0
  if (annualRate < 0.0001) {
    return principal * (1 - paidMonths / totalMonths)
  }
  const r = annualRate / 12
  const totalFactor = (1 + r) ** totalMonths
  const paidFactor = (1 + r) ** paidMonths
  return (principal * (totalFactor - paidFactor)) / (totalFactor - 1)
}

function computeNetCosts(
  price: number,
  rent: number,
  transferTaxRate: number,
  downPct: number,
  rate: number,
  loanMonths: number,
  hausgeld: number,
  appreciationRate: number,
  altRate: number,
  years: number,
): { netBuying: number; netRenting: number } {
  const closingCostRate = transferTaxRate / 100 + NOTARY_AND_REGISTRATION_RATE
  const closingCosts = price * closingCostRate
  const downPayment = price * (downPct / 100)
  const loan = price - downPayment
  // loanMonthsActual caps mortgage payments at the loan term, not the holding period.
  // A buyer who holds past the loan term pays off the mortgage and stops making payments.
  const loanMonthsActual = Math.min(loanMonths, years * 12)
  const payment = annuityPayment(loan, rate, loanMonths)
  const maintenanceMonthly = (price * DEFAULT_MAINTENANCE_RATE) / 12
  // Non-mortgage running costs continue for the full holding period after payoff.
  const nonMortgageMonthly = hausgeld + maintenanceMonthly

  const exitValue = price * (1 + appreciationRate) ** years
  const remainingPrincipal = loanBalance(
    loan,
    rate,
    loanMonths,
    loanMonthsActual,
  )
  const equity = exitValue - remainingPrincipal

  const totalSpent =
    downPayment +
    closingCosts +
    payment * loanMonthsActual +
    nonMortgageMonthly * 12 * years
  const netBuying = totalSpent - equity

  const totalRent = rent * 12 * years
  const capitalInvested = downPayment + closingCosts
  const investmentGain = capitalInvested * ((1 + altRate) ** years - 1)
  const netRenting = totalRent - investmentGain

  return { netBuying, netRenting }
}

function computeResult(form: IFormState): IResult | null {
  const price = parsePosFloat(form.propertyPrice)
  const rent = parsePosFloat(form.monthlyRent)
  if (price <= 0 || rent <= 0) return null

  const stateData = GERMAN_STATES.find((s) => s.code === form.state)
  const transferTaxRate = stateData?.transferTaxRate ?? 5.0

  // downPct: 0% is a valid input (100% financing). Avoid parsePosFloat which
  // rejects 0, which would silently fall back to the 20 default.
  const parsedDown = parseFloat(form.downPaymentPct)
  const downPct = Math.min(
    Number.isFinite(parsedDown) && parsedDown >= 0 ? parsedDown : 20,
    100,
  )
  // 0% rate is valid (interest-free family loan). annuityPayment handles it.
  const parsedRate = parseFloat(form.mortgageRatePct)
  const rate =
    (Number.isFinite(parsedRate) && parsedRate >= 0 ? parsedRate : 3.8) / 100
  const loanTermYears = parsePosFloat(form.loanTermYears) || 25
  const loanMonths = loanTermYears * 12
  const holdingYears = parsePosFloat(form.holdingYears) || 10
  // appreciationRate: negative is valid (property depreciation scenario).
  // parsePosFloat would strip the minus sign and invert the result.
  const parsedAppreciation = parseFloat(form.appreciationPct)
  const appreciationRate =
    (Number.isFinite(parsedAppreciation) ? parsedAppreciation : 2) / 100
  // altRate: 0% is a valid input (modelling no alternative investment).
  const parsedAlt = parseFloat(form.altReturnPct)
  const altRate =
    (Number.isFinite(parsedAlt) && parsedAlt >= 0 ? parsedAlt : 5) / 100
  const hausgeld = parsePosFloat(form.hausgeldMonthly)

  const { netBuying, netRenting } = computeNetCosts(
    price,
    rent,
    transferTaxRate,
    downPct,
    rate,
    loanMonths,
    hausgeld,
    appreciationRate,
    altRate,
    holdingYears,
  )

  const loan = price * (1 - downPct / 100)
  const payment = annuityPayment(loan, rate, loanMonths)
  const maintenanceMonthly = (price * DEFAULT_MAINTENANCE_RATE) / 12
  const monthlyBuyingCost = payment + hausgeld + maintenanceMonthly

  let breakEvenYear: number | null = null
  for (let yr = 1; yr <= NO_BREAK_EVEN_HORIZON; yr++) {
    const { netBuying: nb, netRenting: nr } = computeNetCosts(
      price,
      rent,
      transferTaxRate,
      downPct,
      rate,
      loanMonths,
      hausgeld,
      appreciationRate,
      altRate,
      yr,
    )
    if (nb < nr) {
      breakEvenYear = yr
      break
    }
  }

  const buyingWins = netBuying < netRenting
  const savingsAtHorizon = Math.abs(netBuying - netRenting)

  return {
    monthlyBuyingCost,
    monthlyRentCost: rent,
    netCostBuying: netBuying,
    netCostRenting: netRenting,
    breakEvenYear,
    buyingWins,
    savingsAtHorizon,
    holdingYears,
  }
}

/******************************************************************************
                              Sub-components
******************************************************************************/

interface IFormProps {
  form: IFormState
  onChange: (patch: Partial<IFormState>) => void
}

function RentVsBuyForm({ form, onChange }: Readonly<IFormProps>) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rvb-price">Property price (€)</Label>
          <Input
            id="rvb-price"
            type="number"
            min={0}
            placeholder="e.g. 450000"
            value={form.propertyPrice}
            onChange={(e) => onChange({ propertyPrice: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rvb-rent">Equivalent monthly rent (€)</Label>
          <Input
            id="rvb-rent"
            type="number"
            min={0}
            placeholder="e.g. 1800"
            value={form.monthlyRent}
            onChange={(e) => onChange({ monthlyRent: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rvb-state">Federal state (Bundesland)</Label>
        <Select
          value={form.state}
          onValueChange={(v) => onChange({ state: v })}
        >
          <SelectTrigger id="rvb-state">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GERMAN_STATES.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.name} — {s.transferTaxRate}% Grunderwerbsteuer
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="rvb-down">Down payment (%)</Label>
          <Input
            id="rvb-down"
            type="number"
            min={0}
            max={100}
            placeholder="20"
            value={form.downPaymentPct}
            onChange={(e) => onChange({ downPaymentPct: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rvb-rate">Mortgage rate (%)</Label>
          <Input
            id="rvb-rate"
            type="number"
            min={0}
            placeholder="3.8"
            value={form.mortgageRatePct}
            onChange={(e) => onChange({ mortgageRatePct: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rvb-term">Loan term (years)</Label>
          <Input
            id="rvb-term"
            type="number"
            min={1}
            placeholder="25"
            value={form.loanTermYears}
            onChange={(e) => onChange({ loanTermYears: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rvb-hold">Holding period (years)</Label>
          <Input
            id="rvb-hold"
            type="number"
            min={1}
            placeholder="10"
            value={form.holdingYears}
            onChange={(e) => onChange({ holdingYears: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rvb-appre">Property appreciation (%/yr)</Label>
          <Input
            id="rvb-appre"
            type="number"
            placeholder="2.0"
            value={form.appreciationPct}
            onChange={(e) => onChange({ appreciationPct: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rvb-alt">Alt. investment return (%/yr)</Label>
          <Input
            id="rvb-alt"
            type="number"
            placeholder="5.0"
            value={form.altReturnPct}
            onChange={(e) => onChange({ altReturnPct: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rvb-hausgeld">
          Monthly Hausgeld / running costs (€)
        </Label>
        <Input
          id="rvb-hausgeld"
          type="number"
          min={0}
          placeholder="200"
          value={form.hausgeldMonthly}
          onChange={(e) => onChange({ hausgeldMonthly: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Service charge for apartments (Hausgeld). Enter 0 for a house.
        </p>
      </div>
    </div>
  )
}

interface IResultProps {
  result: IResult
}

function RentVsBuyResult({ result }: Readonly<IResultProps>) {
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const verdictBg = result.buyingWins
    ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900"
    : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
  const verdictTextColor = result.buyingWins
    ? "text-green-700"
    : "text-blue-700"
  const VerdictIcon = result.buyingWins ? TrendingUp : TrendingDown
  const verdictLabel = result.buyingWins
    ? `Buying saves you ${formatEur(result.savingsAtHorizon)} over ${result.holdingYears} years`
    : `Renting saves you ${formatEur(result.savingsAtHorizon)} over ${result.holdingYears} years`

  async function handleCopy() {
    const winner = result.buyingWins ? "Buying" : "Renting"
    const lines = [
      "Rent vs. Buy Analysis — HeimPath",
      `At ${result.holdingYears}-year horizon: ${winner} wins`,
      `Net cost of buying: ${formatEur(result.netCostBuying)}`,
      `Net cost of renting: ${formatEur(result.netCostRenting)}`,
      `Savings: ${formatEur(result.savingsAtHorizon)}`,
      result.breakEvenYear
        ? `Break-even: year ${result.breakEvenYear}`
        : `No break-even within ${NO_BREAK_EVEN_HORIZON} years`,
    ]
    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      showSuccessToast("Analysis copied to clipboard")
    } catch {
      showErrorToast("Could not copy to clipboard")
    }
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 ${verdictBg}`}>
        <div
          className={`flex items-center gap-2 font-semibold ${verdictTextColor}`}
        >
          <VerdictIcon className="h-5 w-5 shrink-0" />
          {verdictLabel}
        </div>
        <p className="mt-1 pl-7 text-xs text-muted-foreground">
          Based on net cost after selling / accounting for investment growth
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Monthly: buying
          </p>
          <p className="mt-1 text-lg font-bold">
            {formatEur(result.monthlyBuyingCost)}
          </p>
          <p className="text-xs text-muted-foreground">
            mortgage + Hausgeld + maintenance
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Monthly: renting
          </p>
          <p className="mt-1 text-lg font-bold">
            {formatEur(result.monthlyRentCost)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Net cost of buying
          </p>
          <p className="mt-1 text-lg font-bold">
            {formatEur(result.netCostBuying)}
          </p>
          <p className="text-xs text-muted-foreground">
            total outflows minus equity at exit
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Net cost of renting
          </p>
          <p className="mt-1 text-lg font-bold">
            {formatEur(result.netCostRenting)}
          </p>
          <p className="text-xs text-muted-foreground">
            rent paid minus investment gains
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Break-even point</p>
        <p className="mt-1 text-2xl font-bold">
          {result.breakEvenYear
            ? `Year ${result.breakEvenYear}`
            : `>${NO_BREAK_EVEN_HORIZON} years`}
        </p>
        <p className="text-xs text-muted-foreground">
          {result.breakEvenYear
            ? "Buying becomes the cheaper option from this year onward"
            : `Buying does not break even within ${NO_BREAK_EVEN_HORIZON} years under these assumptions`}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Net costs include all outflows less asset value at exit. A 1% annual
        interior maintenance reserve (kitchen, bathroom, flooring) is added on
        top of Hausgeld, which covers building-level costs. Renting opportunity
        cost assumes down payment and closing costs are invested at the stated
        return. This is not financial advice.
      </p>

      <Button variant="outline" size="sm" onClick={handleCopy}>
        <Copy className="mr-1.5 h-4 w-4" />
        Copy analysis
      </Button>
    </div>
  )
}

/******************************************************************************
                              Main component
******************************************************************************/

function RentVsBuyCalculator() {
  const [form, setForm] = useState<IFormState>(INITIAL_FORM)

  const result = computeResult(form)

  function handleChange(patch: Partial<IFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Home className="h-5 w-5" />
          Rent vs. Buy Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare the true long-term cost of buying versus renting in Germany,
          accounting for closing costs, equity, and investment opportunity cost.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 lg:grid-cols-2">
          <RentVsBuyForm form={form} onChange={handleChange} />
          {result ? (
            <RentVsBuyResult result={result} />
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Enter a property price and monthly rent to see the comparison.
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

export default RentVsBuyCalculator
