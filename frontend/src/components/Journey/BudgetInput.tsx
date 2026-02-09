/**
 * Budget Input Component
 * Allows user to set budget range for their property search
 */

import { Euro, Info } from "lucide-react"

import { cn } from "@/common/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { COST_DEFAULTS } from "@/common/constants"

interface IProps {
  budgetMin?: number
  budgetMax?: number
  onBudgetMinChange: (value: number | undefined) => void
  onBudgetMaxChange: (value: number | undefined) => void
  targetState?: string
  transferTaxRate?: number
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

/******************************************************************************
                              Functions
******************************************************************************/

/** Parse currency string to number. */
function parseCurrency(value: string): number | undefined {
  const cleaned = value.replace(/[^\d]/g, "")
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? undefined : num
}

/** Calculate additional costs. */
function calculateAdditionalCosts(
  propertyPrice: number,
  transferTaxRate: number
): {
  transferTax: number
  notaryFee: number
  landRegistry: number
  agentFee: number
  total: number
} {
  const transferTax = propertyPrice * (transferTaxRate / 100)
  const notaryFee = propertyPrice * (COST_DEFAULTS.NOTARY_FEE_PERCENT / 100)
  const landRegistry =
    propertyPrice * (COST_DEFAULTS.LAND_REGISTRY_FEE_PERCENT / 100)
  const agentFee =
    propertyPrice * (COST_DEFAULTS.AGENT_COMMISSION_PERCENT / 100)
  const total = transferTax + notaryFee + landRegistry + agentFee

  return { transferTax, notaryFee, landRegistry, agentFee, total }
}

/******************************************************************************
                              Components
******************************************************************************/

/** Cost breakdown display. */
function CostBreakdown(props: { budgetMax: number; transferTaxRate: number }) {
  const { budgetMax, transferTaxRate } = props
  const costs = calculateAdditionalCosts(budgetMax, transferTaxRate)

  return (
    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          Estimated additional costs for {CURRENCY_FORMATTER.format(budgetMax)}
        </span>
      </div>
      <div className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Property Transfer Tax ({transferTaxRate}%)
          </span>
          <span>{CURRENCY_FORMATTER.format(costs.transferTax)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Notary Fee (~{COST_DEFAULTS.NOTARY_FEE_PERCENT}%)
          </span>
          <span>{CURRENCY_FORMATTER.format(costs.notaryFee)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Land Registry (~{COST_DEFAULTS.LAND_REGISTRY_FEE_PERCENT}%)
          </span>
          <span>{CURRENCY_FORMATTER.format(costs.landRegistry)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Agent Fee (~{COST_DEFAULTS.AGENT_COMMISSION_PERCENT}%)
          </span>
          <span>{CURRENCY_FORMATTER.format(costs.agentFee)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 font-medium">
          <span>Total Additional Costs</span>
          <span className="text-blue-600">
            {CURRENCY_FORMATTER.format(costs.total)}
          </span>
        </div>
        <div className="flex justify-between font-semibold text-base">
          <span>Total Investment</span>
          <span>{CURRENCY_FORMATTER.format(budgetMax + costs.total)}</span>
        </div>
      </div>
    </div>
  )
}

/** Default component. Budget range input with cost calculator. */
function BudgetInput(props: IProps) {
  const {
    budgetMin,
    budgetMax,
    onBudgetMinChange,
    onBudgetMaxChange,
    transferTaxRate = 5.0,
    className,
  } = props

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBudgetMinChange(parseCurrency(e.target.value))
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBudgetMaxChange(parseCurrency(e.target.value))
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h3 className="text-lg font-semibold">What's your budget?</h3>
        <p className="text-sm text-muted-foreground">
          Set your property price range (optional but recommended)
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="budgetMin">Minimum Budget</Label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="budgetMin"
              type="text"
              inputMode="numeric"
              placeholder="100,000"
              value={budgetMin ? budgetMin.toLocaleString("de-DE") : ""}
              onChange={handleMinChange}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="budgetMax">Maximum Budget</Label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="budgetMax"
              type="text"
              inputMode="numeric"
              placeholder="500,000"
              value={budgetMax ? budgetMax.toLocaleString("de-DE") : ""}
              onChange={handleMaxChange}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {budgetMax && budgetMax > 0 && (
        <CostBreakdown budgetMax={budgetMax} transferTaxRate={transferTaxRate} />
      )}

      {budgetMin && budgetMax && budgetMin > budgetMax && (
        <p className="text-sm text-destructive">
          Minimum budget cannot be greater than maximum budget
        </p>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { BudgetInput }
