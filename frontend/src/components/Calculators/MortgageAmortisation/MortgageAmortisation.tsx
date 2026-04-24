/**
 * Mortgage Amortisation
 * Main orchestrator: manages state and layout for the mortgage calculator
 */

import { Calculator } from "lucide-react"
import { useState } from "react"
import { cn } from "@/common/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  MortgageInput,
  MortgageResult,
} from "@/models/mortgageAmortisation"
import { MortgageAmortisationChart } from "./MortgageAmortisationChart"
import { MortgageAmortisationForm } from "./MortgageAmortisationForm"
import { MortgageAmortisationResults } from "./MortgageAmortisationResults"
import { MortgageAmortisationTable } from "./MortgageAmortisationTable"
import { MortgageCompareRates } from "./MortgageCompareRates"
import { MortgageEducationalSection } from "./MortgageEducationalSection"
import { MortgageSaleProfitCard } from "./MortgageSaleProfitCard"
import { calculateMortgage } from "./mortgageCalculations"

interface IProps {
  className?: string
}

/******************************************************************************
                              Components
******************************************************************************/

function MortgageAmortisation(props: Readonly<IProps>) {
  const { className } = props

  const [result, setResult] = useState<MortgageResult | null>(null)
  const [lastInput, setLastInput] = useState<MortgageInput | null>(null)

  const handleCalculate = (input: MortgageInput) => {
    setLastInput(input)
    const res = calculateMortgage(input)
    setResult(res)
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <MortgageAmortisationForm onCalculate={handleCalculate} />

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Payment Summary
            </CardTitle>
            <CardDescription>
              Monthly payments, total interest, and LTV analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result && lastInput ? (
              <MortgageAmortisationResults
                result={result}
                fixedRatePeriod={lastInput.fixedRatePeriod}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Enter your mortgage details and click Calculate to see your
                  payment schedule
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart & Table */}
      {result && lastInput && (
        <Card>
          <CardHeader>
            <CardTitle>Amortisation Schedule</CardTitle>
            <CardDescription>
              Year-by-year breakdown of interest and principal payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <MortgageAmortisationChart
              result={result}
              fixedRatePeriod={lastInput.fixedRatePeriod}
            />
            <MortgageAmortisationTable
              result={result}
              fixedRatePeriod={lastInput.fixedRatePeriod}
            />
          </CardContent>
        </Card>
      )}

      {/* Sale profit estimator */}
      {result && lastInput && (
        <MortgageSaleProfitCard
          result={result}
          propertyPrice={lastInput.propertyPrice}
        />
      )}

      {/* Compare Rates */}
      {lastInput && <MortgageCompareRates baseInput={lastInput} />}

      {/* Educational Section */}
      <MortgageEducationalSection />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MortgageAmortisation }
