/**
 * Budget Input Component
 * Allows user to set budget range for their property search
 */

import { Euro } from "lucide-react"
import { cn } from "@/common/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface IProps {
  budgetMin?: number
  budgetMax?: number
  onBudgetMinChange: (value: number | undefined) => void
  onBudgetMaxChange: (value: number | undefined) => void
  className?: string
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Parse currency string to number. */
function parseCurrency(value: string): number | undefined {
  const cleaned = value.replace(/[^\d]/g, "")
  const num = parseInt(cleaned, 10)
  return Number.isNaN(num) ? undefined : num
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Budget range input. */
function BudgetInput(props: IProps) {
  const {
    budgetMin,
    budgetMax,
    onBudgetMinChange,
    onBudgetMaxChange,
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
