/**
 * Mortgage Sale Profit Card
 * Estimates equity and profit if the user sells after 10 years
 */

import { TrendingDown, TrendingUp } from "lucide-react"
import { useState } from "react"
import { cn } from "@/common/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MortgageResult } from "@/models/mortgageAmortisation"

interface IProps {
  result: MortgageResult
  propertyPrice: number
}

/******************************************************************************
                              Constants
******************************************************************************/

const SALE_YEAR = 10
const AGENT_COMMISSION_RATE = 0.0357 // ~3.57% incl. VAT (typical German Maklercourtage)

const CURRENCY = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

/******************************************************************************
                              Functions
******************************************************************************/

function computeSaleProfit(
  propertyPrice: number,
  appreciationPct: number,
  remainingBalance: number,
): {
  estimatedValue: number
  grossEquity: number
  agentCommission: number
  netProfit: number
} {
  const estimatedValue =
    propertyPrice * (1 + appreciationPct / 100) ** SALE_YEAR
  const agentCommission = estimatedValue * AGENT_COMMISSION_RATE
  const grossEquity = estimatedValue - remainingBalance
  const netProfit = grossEquity - agentCommission
  return {
    estimatedValue,
    grossEquity,
    agentCommission,
    netProfit,
  }
}

/******************************************************************************
                              Components
******************************************************************************/

function SaleRow(
  props: Readonly<{
    label: string
    value: string
    sign?: "-"
    bold?: boolean
    highlight?: "profit" | "loss"
  }>,
) {
  const { label, value, sign, bold, highlight } = props
  return (
    <div
      className={cn(
        "flex items-center justify-between py-1.5 text-sm",
        bold && "font-semibold",
        highlight === "profit" && "text-green-700 dark:text-green-400",
        highlight === "loss" && "text-red-600 dark:text-red-400",
      )}
    >
      <span className={cn(!highlight && "text-muted-foreground")}>{label}</span>
      <span>
        {sign && (
          <span className="mr-0.5 text-xs text-muted-foreground">{sign}</span>
        )}
        {value}
      </span>
    </div>
  )
}

/** Default component. "If you sell after 10 years" profit estimator. */
function MortgageSaleProfitCard(props: Readonly<IProps>) {
  const { result, propertyPrice } = props
  const [appreciationPct, setAppreciationPct] = useState("2")

  const balanceRow = result.schedule[SALE_YEAR - 1]
  const remainingBalance = balanceRow?.remainingBalance ?? 0

  const appreciation = Number.parseFloat(appreciationPct) || 0
  const { estimatedValue, agentCommission, grossEquity, netProfit } =
    computeSaleProfit(propertyPrice, appreciation, remainingBalance)

  const isProfit = netProfit >= 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {isProfit ? (
            <TrendingUp className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          If You Sell After {SALE_YEAR} Years
        </CardTitle>
        <CardDescription>
          Estimated profit based on property appreciation and outstanding
          mortgage balance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Appreciation rate input */}
        <div className="flex items-center gap-3">
          <Label htmlFor="appreciation-rate" className="shrink-0 text-sm">
            Annual appreciation
          </Label>
          <div className="flex items-center gap-1.5">
            <Input
              id="appreciation-rate"
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={appreciationPct}
              onChange={(e) => setAppreciationPct(e.target.value)}
              className="w-20 text-center"
            />
            <span className="text-sm text-muted-foreground">% / year</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="rounded-lg border divide-y">
          <div className="px-3">
            <SaleRow
              label="Estimated property value"
              value={CURRENCY.format(estimatedValue)}
            />
            <SaleRow
              label={`Outstanding mortgage at year ${SALE_YEAR}`}
              value={CURRENCY.format(remainingBalance)}
              sign="-"
            />
          </div>
          <div className="px-3">
            <SaleRow
              label="Gross equity"
              value={CURRENCY.format(grossEquity)}
              bold
            />
            <SaleRow
              label="Agent commission (~3.57%)"
              value={CURRENCY.format(agentCommission)}
              sign="-"
            />
          </div>
          <div className="px-3">
            <SaleRow
              label="Estimated net profit"
              value={CURRENCY.format(netProfit)}
              bold
              highlight={isProfit ? "profit" : "loss"}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Assumes {appreciation}% annual appreciation. Agent commission ~3.57%
          (typical Maklercourtage incl. VAT). Excludes purchase costs already
          paid and any capital gains tax (Spekulationssteuer exempt after 10
          yrs).
        </p>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { MortgageSaleProfitCard }
