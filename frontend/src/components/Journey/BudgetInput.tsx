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
  isRental?: boolean
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
function BudgetInput(props: Readonly<IProps>) {
  const {
    budgetMin,
    budgetMax,
    onBudgetMinChange,
    onBudgetMaxChange,
    isRental = false,
    className,
  } = props

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBudgetMinChange(parseCurrency(e.target.value))
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBudgetMaxChange(parseCurrency(e.target.value))
  }

  const label = isRental ? "Maximum monthly rent budget" : "Budget range"
  const minPlaceholder = isRental ? "Min. monthly rent" : "Min."
  const maxPlaceholder = isRental ? "Max. monthly rent" : "Max."

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold">
          {isRental
            ? "What is your monthly rent budget?"
            : "What is your budget?"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isRental
            ? "Set your monthly rent range in euros (optional)"
            : "Set your total purchase budget range in euros (optional)"}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="budgetMin"
              type="text"
              inputMode="numeric"
              placeholder={minPlaceholder}
              value={budgetMin ? budgetMin.toLocaleString("de-DE") : ""}
              onChange={handleMinChange}
              className="pl-9"
            />
          </div>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="budgetMax"
              type="text"
              inputMode="numeric"
              placeholder={maxPlaceholder}
              value={budgetMax ? budgetMax.toLocaleString("de-DE") : ""}
              onChange={handleMaxChange}
              className="pl-9"
            />
          </div>
        </div>
        {budgetMin && budgetMax && budgetMin > budgetMax && (
          <p className="text-sm text-destructive">
            Min. cannot be greater than max.
          </p>
        )}
      </div>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { BudgetInput }
