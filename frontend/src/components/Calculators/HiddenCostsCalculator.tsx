/**
 * Hidden Costs Calculator Component
 * Calculates total cost of property ownership including all fees
 */

import { useState, useMemo } from "react"
import { Calculator, Euro, Info, Download, RefreshCw, Save, Share2, Trash2, ExternalLink } from "lucide-react"

import { cn } from "@/common/utils"
import { GERMAN_STATES, PROPERTY_TYPES, COST_DEFAULTS } from "@/common/constants"
import { useSaveCalculation, useDeleteCalculation } from "@/hooks/mutations/useCalculatorMutations"
import { useUserCalculations } from "@/hooks/queries/useCalculatorQueries"
import type { HiddenCostCalculationInput } from "@/models/calculator"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface IProps {
  className?: string
}

/******************************************************************************
                              Types
******************************************************************************/

interface CostBreakdown {
  propertyPrice: number
  transferTax: number
  notaryFee: number
  landRegistryFee: number
  agentCommission: number
  renovationEstimate: number
  movingCosts: number
  totalAdditionalCosts: number
  totalCostOfOwnership: number
  additionalCostPercentage: number
}

interface CalculatorInputs {
  propertyPrice: string
  state: string
  propertyType: string
  includeAgent: boolean
  renovationLevel: "none" | "light" | "medium" | "full"
  includeMoving: boolean
}

/******************************************************************************
                              Constants
******************************************************************************/

const CURRENCY_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const RENOVATION_MULTIPLIERS: Record<string, number> = {
  none: 0,
  light: 0.03, // 3% of property price
  medium: 0.08, // 8% of property price
  full: 0.15, // 15% of property price
}

const MOVING_COST_ESTIMATE = 3000 // Flat estimate for moving costs

/******************************************************************************
                              Functions
******************************************************************************/

/** Calculate all costs based on inputs. */
function calculateCosts(inputs: CalculatorInputs): CostBreakdown | null {
  const price = parseFloat(inputs.propertyPrice.replace(/[^\d]/g, ""))
  if (isNaN(price) || price <= 0) return null

  const state = GERMAN_STATES.find((s) => s.code === inputs.state)
  const transferTaxRate = state?.transferTaxRate || 5.0

  const transferTax = price * (transferTaxRate / 100)
  const notaryFee = price * (COST_DEFAULTS.NOTARY_FEE_PERCENT / 100)
  const landRegistryFee = price * (COST_DEFAULTS.LAND_REGISTRY_FEE_PERCENT / 100)
  const agentCommission = inputs.includeAgent
    ? price * (COST_DEFAULTS.AGENT_COMMISSION_PERCENT / 100)
    : 0
  const renovationEstimate =
    price * RENOVATION_MULTIPLIERS[inputs.renovationLevel]
  const movingCosts = inputs.includeMoving ? MOVING_COST_ESTIMATE : 0

  const totalAdditionalCosts =
    transferTax +
    notaryFee +
    landRegistryFee +
    agentCommission +
    renovationEstimate +
    movingCosts

  return {
    propertyPrice: price,
    transferTax,
    notaryFee,
    landRegistryFee,
    agentCommission,
    renovationEstimate,
    movingCosts,
    totalAdditionalCosts,
    totalCostOfOwnership: price + totalAdditionalCosts,
    additionalCostPercentage: (totalAdditionalCosts / price) * 100,
  }
}

/******************************************************************************
                              Components
******************************************************************************/

/** Cost line item display. */
function CostLineItem(props: {
  label: string
  amount: number
  percentage?: number
  highlight?: boolean
  info?: string
}) {
  const { label, amount, percentage, highlight, info } = props

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2",
        highlight && "font-semibold text-lg"
      )}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {info && (
          <span
            className="text-xs text-muted-foreground"
            title={info}
          >
            <Info className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="text-right">
        <span className={cn(highlight && "text-blue-600")}>
          {CURRENCY_FORMATTER.format(amount)}
        </span>
        {percentage !== undefined && (
          <span className="text-xs text-muted-foreground ml-2">
            ({percentage.toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  )
}

/** Default component. Hidden costs calculator. */
function HiddenCostsCalculator(props: IProps) {
  const { className } = props

  const [inputs, setInputs] = useState<CalculatorInputs>({
    propertyPrice: "",
    state: "BY",
    propertyType: "apartment",
    includeAgent: true,
    renovationLevel: "light",
    includeMoving: true,
  })

  const [saveName, setSaveName] = useState("")
  const [shareUrl, setShareUrl] = useState("")

  const saveCalculation = useSaveCalculation()
  const deleteCalculation = useDeleteCalculation()
  const { data: savedCalcs } = useUserCalculations()

  const costs = useMemo(() => calculateCosts(inputs), [inputs])

  const updateInput = <K extends keyof CalculatorInputs>(
    key: K,
    value: CalculatorInputs[K]
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "")
    updateInput("propertyPrice", value)
  }

  const handleReset = () => {
    setInputs({
      propertyPrice: "",
      state: "BY",
      propertyType: "apartment",
      includeAgent: true,
      renovationLevel: "light",
      includeMoving: true,
    })
  }

  const handleExport = () => {
    if (!costs) return

    const data = {
      inputs: {
        propertyPrice: costs.propertyPrice,
        state: inputs.state,
        propertyType: inputs.propertyType,
      },
      breakdown: costs,
      generatedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `cost-calculation-${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleSave = () => {
    if (!costs) return
    const input: HiddenCostCalculationInput = {
      name: saveName || undefined,
      propertyPrice: costs.propertyPrice,
      stateCode: inputs.state,
      propertyType: inputs.propertyType,
      includeAgent: inputs.includeAgent,
      renovationLevel: inputs.renovationLevel,
      includeMoving: inputs.includeMoving,
    }
    saveCalculation.mutate(input, {
      onSuccess: (saved) => {
        setSaveName("")
        if (saved.shareId) {
          const url = `${window.location.origin}/calculators?share=${saved.shareId}`
          setShareUrl(url)
        }
      },
    })
  }

  const handleCopyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
    }
  }

  const handleDelete = (id: string) => {
    deleteCalculation.mutate(id)
  }

  const selectedState = GERMAN_STATES.find((s) => s.code === inputs.state)

  return (
  <>
    <div className={cn("grid gap-6 lg:grid-cols-2", className)}>
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Hidden Costs Calculator
          </CardTitle>
          <CardDescription>
            Calculate the true cost of buying property in Germany
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Property Price */}
          <div className="space-y-2">
            <Label htmlFor="propertyPrice">Property Price</Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="propertyPrice"
                type="text"
                inputMode="numeric"
                placeholder="Enter property price"
                value={
                  inputs.propertyPrice
                    ? parseInt(inputs.propertyPrice).toLocaleString("de-DE")
                    : ""
                }
                onChange={handlePriceChange}
                className="pl-9"
              />
            </div>
          </div>

          {/* State Selection */}
          <div className="space-y-2">
            <Label>German State</Label>
            <Select
              value={inputs.state}
              onValueChange={(v) => updateInput("state", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {GERMAN_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name} ({state.transferTaxRate}% tax)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <Label>Property Type</Label>
            <Select
              value={inputs.propertyType}
              onValueChange={(v) => updateInput("propertyType", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Include Agent Commission</Label>
              <p className="text-xs text-muted-foreground">
                ~{COST_DEFAULTS.AGENT_COMMISSION_PERCENT}% buyer's share
              </p>
            </div>
            <Button
              variant={inputs.includeAgent ? "default" : "outline"}
              size="sm"
              onClick={() => updateInput("includeAgent", !inputs.includeAgent)}
            >
              {inputs.includeAgent ? "Yes" : "No"}
            </Button>
          </div>

          {/* Renovation Level */}
          <div className="space-y-2">
            <Label>Expected Renovation</Label>
            <Select
              value={inputs.renovationLevel}
              onValueChange={(v) =>
                updateInput("renovationLevel", v as CalculatorInputs["renovationLevel"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (move-in ready)</SelectItem>
                <SelectItem value="light">Light (~3%)</SelectItem>
                <SelectItem value="medium">Medium (~8%)</SelectItem>
                <SelectItem value="full">Full renovation (~15%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Moving Costs Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Include Moving Costs</Label>
              <p className="text-xs text-muted-foreground">
                ~{CURRENCY_FORMATTER.format(MOVING_COST_ESTIMATE)} estimate
              </p>
            </div>
            <Button
              variant={inputs.includeMoving ? "default" : "outline"}
              size="sm"
              onClick={() => updateInput("includeMoving", !inputs.includeMoving)}
            >
              {inputs.includeMoving ? "Yes" : "No"}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>
            {selectedState
              ? `Costs for property in ${selectedState.name}`
              : "Select a state to see costs"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {costs ? (
            <div className="space-y-4">
              <CostLineItem
                label="Property Price"
                amount={costs.propertyPrice}
              />

              <Separator />

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Transaction Costs
                </p>
                <CostLineItem
                  label={`Transfer Tax (${selectedState?.transferTaxRate}%)`}
                  amount={costs.transferTax}
                  percentage={
                    (costs.transferTax / costs.propertyPrice) * 100
                  }
                  info="Grunderwerbsteuer - varies by state"
                />
                <CostLineItem
                  label="Notary Fee"
                  amount={costs.notaryFee}
                  percentage={(costs.notaryFee / costs.propertyPrice) * 100}
                  info="Required for all property transactions"
                />
                <CostLineItem
                  label="Land Registry Fee"
                  amount={costs.landRegistryFee}
                  percentage={
                    (costs.landRegistryFee / costs.propertyPrice) * 100
                  }
                  info="Grundbucheintragung"
                />
                {costs.agentCommission > 0 && (
                  <CostLineItem
                    label="Agent Commission"
                    amount={costs.agentCommission}
                    percentage={
                      (costs.agentCommission / costs.propertyPrice) * 100
                    }
                    info="Buyer's share of Maklergebühr"
                  />
                )}
              </div>

              {(costs.renovationEstimate > 0 || costs.movingCosts > 0) && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Additional Costs
                    </p>
                    {costs.renovationEstimate > 0 && (
                      <CostLineItem
                        label="Renovation Estimate"
                        amount={costs.renovationEstimate}
                        percentage={
                          (costs.renovationEstimate / costs.propertyPrice) * 100
                        }
                      />
                    )}
                    {costs.movingCosts > 0 && (
                      <CostLineItem
                        label="Moving Costs"
                        amount={costs.movingCosts}
                      />
                    )}
                  </div>
                </>
              )}

              <Separator />

              <CostLineItem
                label="Total Additional Costs"
                amount={costs.totalAdditionalCosts}
                percentage={costs.additionalCostPercentage}
                highlight
              />

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">Total Cost of Ownership</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {CURRENCY_FORMATTER.format(costs.totalCostOfOwnership)}
                  </span>
                </div>
              </div>

              <Button onClick={handleExport} variant="outline" className="w-full gap-2">
                <Download className="h-4 w-4" />
                Export Results
              </Button>

              {/* Save Section */}
              <div className="space-y-2">
                <Input
                  placeholder="Name this calculation (optional)"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
                <Button
                  onClick={handleSave}
                  disabled={saveCalculation.isPending}
                  className="w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saveCalculation.isPending ? "Saving..." : "Save Calculation"}
                </Button>
              </div>

              {/* Share URL */}
              {shareUrl && (
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Share Link
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyShareUrl}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Enter a property price to see the cost breakdown
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Saved Calculations */}
    {savedCalcs && savedCalcs.data.length > 0 && (
      <SavedCalculations
        calculations={savedCalcs.data}
        onDelete={handleDelete}
        isDeleting={deleteCalculation.isPending}
      />
    )}
  </>
  )
}

/** Saved calculations list. */
function SavedCalculations(props: {
  calculations: { id: string; name?: string; shareId?: string; propertyPrice: number; stateCode: string; totalAdditionalCosts: number; totalCostOfOwnership: number; createdAt: string }[]
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const { calculations, onDelete, isDeleting } = props

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Saved Calculations</CardTitle>
        <CardDescription>
          Your previously saved cost calculations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {calculations.map((calc) => {
            const stateName = GERMAN_STATES.find((s) => s.code === calc.stateCode)?.name || calc.stateCode
            return (
              <div
                key={calc.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {calc.name || `${stateName} - ${CURRENCY_FORMATTER.format(calc.propertyPrice)}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total: {CURRENCY_FORMATTER.format(calc.totalCostOfOwnership)}
                    {" · "}
                    {new Date(calc.createdAt).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {calc.shareId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const url = `${window.location.origin}/calculators?share=${calc.shareId}`
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
                    onClick={() => onDelete(calc.id)}
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { HiddenCostsCalculator }
