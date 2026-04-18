/**
 * Mortgage Compare Rates
 * Side-by-side comparison of 2-3 rate scenarios
 */

import { ArrowDown, ChevronDown, Plus, Trophy, X } from "lucide-react"
import { useState } from "react"
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
import type {
  MortgageInput,
  MortgageResult,
  MortgageScenarioInput,
} from "@/models/mortgageAmortisation"
import { FormRow } from "../common/FormRow"
import { calculateCompareScenarios } from "./mortgageCalculations"

interface IProps {
  baseInput: MortgageInput
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

let nextScenarioId = 0
function genId(): string {
  return `scenario-${++nextScenarioId}`
}

const DEFAULT_SCENARIO: Omit<MortgageScenarioInput, "id"> = {
  label: "",
  interestRate: 3.5,
  initialRepaymentRate: 2,
  fixedRatePeriod: 10,
  specialRepaymentPercent: 0,
}

const MAX_SCENARIOS = 3

/******************************************************************************
                              Components
******************************************************************************/

function ScenarioRow(
  props: Readonly<{
    index: number
    scenario: MortgageScenarioInput
    onChange: (s: MortgageScenarioInput) => void
    onRemove: () => void
    canRemove: boolean
  }>,
) {
  const { index, scenario, onChange, onRemove, canRemove } = props

  const updateField = (key: keyof MortgageScenarioInput, v: string) =>
    onChange({
      ...scenario,
      [key]: key === "label" ? v : Number.parseFloat(v) || 0,
    })

  return (
    <div className="rounded-lg border border-dashed p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium">Scenario {index + 1}</h5>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <FormRow htmlFor={`label-${index}`} label="Label">
        <Input
          id={`label-${index}`}
          placeholder={`e.g. Bank ${index + 1}`}
          value={scenario.label}
          onChange={(e) => updateField("label", e.target.value)}
        />
      </FormRow>
      <FormRow htmlFor={`rate-${index}`} label="Interest Rate (%)">
        <Input
          id={`rate-${index}`}
          type="number"
          min="0"
          max="15"
          step="0.1"
          value={scenario.interestRate}
          onChange={(e) => updateField("interestRate", e.target.value)}
        />
      </FormRow>
      <FormRow htmlFor={`repay-${index}`} label="Repayment Rate (%)">
        <Input
          id={`repay-${index}`}
          type="number"
          min="1"
          max="10"
          step="0.5"
          value={scenario.initialRepaymentRate}
          onChange={(e) => updateField("initialRepaymentRate", e.target.value)}
        />
      </FormRow>
      <FormRow htmlFor={`fixed-${index}`} label="Fixed Period (years)">
        <Input
          id={`fixed-${index}`}
          type="number"
          min="5"
          max="30"
          step="5"
          value={scenario.fixedRatePeriod}
          onChange={(e) => updateField("fixedRatePeriod", e.target.value)}
        />
      </FormRow>
    </div>
  )
}

function ResultCard(
  props: Readonly<{
    label: string
    result: MortgageResult
    isWinner: boolean
  }>,
) {
  const { label, result, isWinner } = props

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3",
        isWinner &&
          "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20",
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-sm">
        {label}
        {isWinner && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <Trophy className="h-3 w-3" />
            Best
          </span>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Monthly Payment</span>
          <span className="font-medium">
            {CURRENCY.format(result.monthlyPayment)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Interest</span>
          <span>{CURRENCY.format(result.totalInterestOverLife)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payoff</span>
          <span>
            {result.fullRepaymentDate} ({result.yearsToFullRepayment} yrs)
          </span>
        </div>
      </div>
    </div>
  )
}

function MortgageCompareRates(props: Readonly<IProps>) {
  const { baseInput } = props
  const [isOpen, setIsOpen] = useState(false)
  const [scenarios, setScenarios] = useState<MortgageScenarioInput[]>([
    {
      ...DEFAULT_SCENARIO,
      id: genId(),
      label: "Scenario A",
      interestRate: 3.0,
    },
    {
      ...DEFAULT_SCENARIO,
      id: genId(),
      label: "Scenario B",
      interestRate: 4.0,
    },
  ])
  const [results, setResults] = useState<MortgageResult[] | null>(null)

  const handleScenarioChange = (idx: number, s: MortgageScenarioInput) => {
    setScenarios((prev) => prev.map((p, i) => (i === idx ? s : p)))
    setResults(null)
  }

  const handleRemove = (idx: number) => {
    setScenarios((prev) => prev.filter((_, i) => i !== idx))
    setResults(null)
  }

  const handleAdd = () => {
    setScenarios((prev) => [
      ...prev,
      {
        ...DEFAULT_SCENARIO,
        id: genId(),
        label: `Scenario ${String.fromCharCode(65 + prev.length)}`,
      },
    ])
    setResults(null)
  }

  const handleCompare = () => {
    const res = calculateCompareScenarios(baseInput, scenarios)
    setResults(res)
  }

  const winnerIdx = results
    ? results.reduce(
        (best, r, i) =>
          r.totalInterestOverLife < results[best].totalInterestOverLife
            ? i
            : best,
        0,
      )
    : -1

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsOpen((p) => !p)}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDown className="h-5 w-5" />
              Compare Rates
            </CardTitle>
            <CardDescription>
              Compare 2-3 different mortgage scenarios side by side
            </CardDescription>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-4">
          {/* Scenario inputs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((s, i) => (
              <ScenarioRow
                key={s.id}
                index={i}
                scenario={s}
                onChange={(upd) => handleScenarioChange(i, upd)}
                onRemove={() => handleRemove(i)}
                canRemove={scenarios.length > 2}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {scenarios.length < MAX_SCENARIOS && (
              <Button variant="outline" onClick={handleAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Scenario
              </Button>
            )}
            <Button onClick={handleCompare} className="gap-2">
              Compare
            </Button>
          </div>

          {/* Results */}
          {results && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r, i) => (
                <ResultCard
                  key={i}
                  label={scenarios[i].label || `Scenario ${i + 1}`}
                  result={r}
                  isWinner={i === winnerIdx}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MortgageCompareRates }
