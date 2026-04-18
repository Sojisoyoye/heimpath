/**
 * Ownership Comparison Results
 * Side-by-side summary cards with breakeven indicator, save, and saved list
 */

import {
  Building2,
  ExternalLink,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/common/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import type {
  OwnershipComparisonResult,
  OwnershipComparisonSummary,
} from "@/models/ownershipComparison"

interface IProps {
  results: OwnershipComparisonResult
  onSave: (name: string) => void
  isSaving: boolean
  savedComparisons: OwnershipComparisonSummary[]
  onDelete: (id: string) => void
  isDeleting: boolean
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const PERCENT = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

/******************************************************************************
                              Components
******************************************************************************/

function ScenarioCard(props: {
  title: string
  icon: React.ReactNode
  effectiveTaxRate: number
  totalNetRentalIncome: number
  capitalGainsTax: number
  netExitProceeds: number
  totalWealth: number
  isWinner: boolean
}) {
  const {
    title,
    icon,
    effectiveTaxRate,
    totalNetRentalIncome,
    capitalGainsTax,
    netExitProceeds,
    totalWealth,
    isWinner,
  } = props

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3",
        isWinner &&
          "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20",
      )}
    >
      <div className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
        {isWinner && (
          <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Better
          </span>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Effective Tax Rate</span>
          <span className="font-medium">
            {PERCENT.format(effectiveTaxRate)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Net Rental Income</span>
          <span>{CURRENCY.format(totalNetRentalIncome)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Capital Gains Tax</span>
          <span className={capitalGainsTax === 0 ? "text-green-600" : ""}>
            {CURRENCY.format(capitalGainsTax)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Net Exit Proceeds</span>
          <span>{CURRENCY.format(netExitProceeds)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-semibold text-base">
          <span>Total Wealth</span>
          <span>{CURRENCY.format(totalWealth)}</span>
        </div>
      </div>
    </div>
  )
}

function OwnershipComparisonResults(props: IProps) {
  const { results, onSave, isSaving, savedComparisons, onDelete, isDeleting } =
    props
  const [saveName, setSaveName] = useState("")

  const gmbhWins = results.gmbhAdvantageAtExit > 0
  const advantage = Math.abs(results.gmbhAdvantageAtExit)

  return (
    <div className="space-y-6">
      {/* Recommendation banner */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg p-3 text-sm font-medium",
          gmbhWins
            ? "bg-purple-50 text-purple-800 dark:bg-purple-950/20 dark:text-purple-300"
            : "bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300",
        )}
      >
        {gmbhWins ? (
          <Building2 className="h-4 w-4 shrink-0" />
        ) : (
          <User className="h-4 w-4 shrink-0" />
        )}
        <span>{results.recommendation}</span>
      </div>

      {/* Advantage amount */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {gmbhWins ? "GmbH" : "Private"} advantage
        </p>
        <p className="text-2xl font-bold flex items-center justify-center gap-1">
          {gmbhWins ? (
            <TrendingUp className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5 text-blue-600" />
          )}
          {CURRENCY.format(advantage)}
        </p>
        {results.breakevenYear && (
          <p className="text-xs text-muted-foreground mt-1">
            GmbH breaks even at year {results.breakevenYear}
          </p>
        )}
      </div>

      {/* Side-by-side cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ScenarioCard
          title="Private"
          icon={<User className="h-4 w-4 text-blue-600" />}
          effectiveTaxRate={results.private.effectiveTaxRate}
          totalNetRentalIncome={results.private.totalNetRentalIncome}
          capitalGainsTax={results.private.capitalGainsTax}
          netExitProceeds={results.private.netExitProceeds}
          totalWealth={results.private.totalWealth}
          isWinner={!gmbhWins}
        />
        <ScenarioCard
          title="GmbH"
          icon={<Building2 className="h-4 w-4 text-purple-600" />}
          effectiveTaxRate={results.gmbh.effectiveTaxRate}
          totalNetRentalIncome={results.gmbh.totalNetRentalIncome}
          capitalGainsTax={results.gmbh.capitalGainsTax}
          netExitProceeds={results.gmbh.netExitProceeds}
          totalWealth={results.gmbh.totalWealth}
          isWinner={gmbhWins}
        />
      </div>

      <Separator />

      {/* Save */}
      <div className="space-y-2">
        <Input
          placeholder="Name this comparison (optional)"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
        />
        <Button
          onClick={() => {
            onSave(saveName)
            setSaveName("")
          }}
          disabled={isSaving}
          className="w-full gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Comparison"}
        </Button>
      </div>

      {/* Saved list */}
      {savedComparisons.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Saved Comparisons
          </h4>
          {savedComparisons.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {c.name || CURRENCY.format(c.totalPropertyValue)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.recommendation}
                  {" · "}
                  {new Date(c.createdAt).toLocaleDateString("de-DE")}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {c.shareId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/calculators?ownershipShare=${c.shareId}`
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
                  onClick={() => onDelete(c.id)}
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
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { OwnershipComparisonResults }
