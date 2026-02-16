/**
 * State Comparison Component
 * Compares hidden costs across all 16 German states for a given property price
 */

import { useState } from "react"
import { ArrowUpDown, Euro, TrendingDown, TrendingUp } from "lucide-react"

import { cn } from "@/common/utils"
import { useStateComparison } from "@/hooks/queries/useCalculatorQueries"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface IProps {
  className?: string
  initialPrice?: number
  initialIncludeAgent?: boolean
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
                              Components
******************************************************************************/

/** Default component. State comparison table. */
function StateComparison(props: IProps) {
  const { className, initialPrice = 0, initialIncludeAgent = true } = props

  const [priceInput, setPriceInput] = useState(
    initialPrice > 0 ? String(initialPrice) : ""
  )
  const [includeAgent, setIncludeAgent] = useState(initialIncludeAgent)

  const price = parseFloat(priceInput.replace(/[^\d]/g, "")) || 0

  const { data, isLoading } = useStateComparison(price, includeAgent)

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "")
    setPriceInput(value)
  }

  const cheapest = data?.data[0]
  const mostExpensive = data?.data[data.data.length - 1]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Compare All States
          </CardTitle>
          <CardDescription>
            See how hidden costs vary across all 16 German states
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="comparePrice">Property Price</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="comparePrice"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter property price"
                  value={
                    priceInput
                      ? parseInt(priceInput).toLocaleString("de-DE")
                      : ""
                  }
                  onChange={handlePriceChange}
                  className="pl-9"
                />
              </div>
            </div>
            <Button
              variant={includeAgent ? "default" : "outline"}
              size="sm"
              onClick={() => setIncludeAgent(!includeAgent)}
              className="whitespace-nowrap"
            >
              Agent: {includeAgent ? "Yes" : "No"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {price > 0 && data && (
        <>
          {/* Highlights */}
          <div className="grid gap-4 sm:grid-cols-2">
            {cheapest && (
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-sm font-medium">Cheapest</span>
                  </div>
                  <p className="font-semibold">{cheapest.stateName}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {CURRENCY_FORMATTER.format(cheapest.totalCost)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cheapest.transferTaxRate}% transfer tax
                  </p>
                </CardContent>
              </Card>
            )}
            {mostExpensive && (
              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">Most Expensive</span>
                  </div>
                  <p className="font-semibold">{mostExpensive.stateName}</p>
                  <p className="text-2xl font-bold text-red-600">
                    {CURRENCY_FORMATTER.format(mostExpensive.totalCost)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mostExpensive.transferTaxRate}% transfer tax
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Table */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">State</th>
                      <th className="pb-3 font-medium text-right">Tax Rate</th>
                      <th className="pb-3 font-medium text-right">Transfer Tax</th>
                      <th className="pb-3 font-medium text-right">Notary</th>
                      <th className="pb-3 font-medium text-right">Registry</th>
                      {includeAgent && (
                        <th className="pb-3 font-medium text-right">Agent</th>
                      )}
                      <th className="pb-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((item, idx) => {
                      const isCheapest = idx === 0
                      const isMostExpensive = idx === data.data.length - 1

                      return (
                        <tr
                          key={item.stateCode}
                          className={cn(
                            "border-b last:border-0",
                            isCheapest && "bg-green-50 dark:bg-green-950/20",
                            isMostExpensive && "bg-red-50 dark:bg-red-950/20"
                          )}
                        >
                          <td className="py-3 font-medium">{item.stateName}</td>
                          <td className="py-3 text-right">{item.transferTaxRate}%</td>
                          <td className="py-3 text-right">
                            {CURRENCY_FORMATTER.format(item.transferTax)}
                          </td>
                          <td className="py-3 text-right">
                            {CURRENCY_FORMATTER.format(item.notaryFee)}
                          </td>
                          <td className="py-3 text-right">
                            {CURRENCY_FORMATTER.format(item.landRegistryFee)}
                          </td>
                          {includeAgent && (
                            <td className="py-3 text-right">
                              {CURRENCY_FORMATTER.format(item.agentCommission)}
                            </td>
                          )}
                          <td className="py-3 text-right font-semibold">
                            {CURRENCY_FORMATTER.format(item.totalCost)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {price > 0 && isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading comparison...</p>
          </CardContent>
        </Card>
      )}

      {price <= 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowUpDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Enter a property price to compare costs across all states
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { StateComparison }
