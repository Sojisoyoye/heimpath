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
import {
  MortgageAmortisationForm,
  type MortgageInitialValues,
} from "./MortgageAmortisationForm"
import { MortgageAmortisationResults } from "./MortgageAmortisationResults"
import { MortgageAmortisationTable } from "./MortgageAmortisationTable"
import { MortgageCompareRates } from "./MortgageCompareRates"
import { MortgageEducationalSection } from "./MortgageEducationalSection"
import { MortgageSaleProfitCard } from "./MortgageSaleProfitCard"
import { calculateMortgage } from "./mortgageCalculations"

interface IProps {
  className?: string
  initialValues?: MortgageInitialValues
}

/******************************************************************************
                              Functions
******************************************************************************/

/** Build a fully-resolved mortgage input from partial prefill values, defaulting the rest. */
function buildInitialInput(
  initialValues?: MortgageInitialValues,
): MortgageInput | null {
  if (!initialValues?.propertyPrice || initialValues.propertyPrice <= 0)
    return null
  const downPaymentPercent = initialValues.downPaymentPercent ?? 20
  return {
    propertyPrice: initialValues.propertyPrice,
    downPaymentAmount: initialValues.propertyPrice * (downPaymentPercent / 100),
    downPaymentPercent,
    interestRate: initialValues.interestRate ?? 3.5,
    initialRepaymentRate: initialValues.initialRepaymentRate ?? 2,
    fixedRatePeriod: initialValues.fixedRatePeriod ?? 10,
    specialRepaymentPercent: 0,
  }
}

/******************************************************************************
                              Components
******************************************************************************/

function MortgageAmortisation(props: Readonly<IProps>) {
  const { className, initialValues } = props

  const [result, setResult] = useState<MortgageResult | null>(() => {
    const initialInput = buildInitialInput(initialValues)
    return initialInput ? calculateMortgage(initialInput) : null
  })
  const [lastInput, setLastInput] = useState<MortgageInput | null>(() =>
    buildInitialInput(initialValues),
  )

  const handleCalculate = (input: MortgageInput) => {
    setLastInput(input)
    const res = calculateMortgage(input)
    setResult(res)
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <MortgageAmortisationForm
          onCalculate={handleCalculate}
          initialValues={initialValues}
        />

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
