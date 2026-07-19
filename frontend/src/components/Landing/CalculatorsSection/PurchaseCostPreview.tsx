/**
 * Purchase Cost mini-preview
 * Compact landing-page preview of the purchase cost calculator — a few
 * fields plus a live computed result, with a link to the full detailed page.
 */

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useMemo, useState } from "react"
import { COST_DEFAULTS, GERMAN_STATES } from "@/common/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CURRENCY_FORMATTER, PreviewMetric } from "./MortgagePreview"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Purchase Cost tab preview. */
function PurchaseCostPreview() {
  const [propertyPrice, setPropertyPrice] = useState("450000")
  const [state, setState] = useState("BE")

  const price = Number.parseFloat(propertyPrice) || 0
  const stateInfo = GERMAN_STATES.find((s) => s.code === state)

  const costs = useMemo(() => {
    if (price <= 0 || !stateInfo) return null
    const transferTax = price * (stateInfo.transferTaxRate / 100)
    const notaryFee = price * (COST_DEFAULTS.NOTARY_FEE_PERCENT / 100)
    const landRegistryFee =
      price * (COST_DEFAULTS.LAND_REGISTRY_FEE_PERCENT / 100)
    const agentCommission =
      price * (COST_DEFAULTS.AGENT_COMMISSION_PERCENT / 100)
    return {
      transferTax,
      notaryPlusLand: notaryFee + landRegistryFee,
      totalAdditional:
        transferTax + notaryFee + landRegistryFee + agentCommission,
    }
  }, [price, stateInfo])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="pc-price"
            className="font-mono text-xs text-muted-foreground"
          >
            Property Price
          </label>
          <Input
            id="pc-price"
            inputMode="numeric"
            value={propertyPrice}
            onChange={(e) =>
              setPropertyPrice(e.target.value.replace(/[^\d]/g, ""))
            }
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="pc-state"
            className="font-mono text-xs text-muted-foreground"
          >
            State
          </label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger id="pc-state" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GERMAN_STATES.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {costs && (
        <div className="grid grid-cols-3 gap-2">
          <PreviewMetric
            label="Transfer Tax"
            value={CURRENCY_FORMATTER.format(costs.transferTax)}
          />
          <PreviewMetric
            label="Notary + Land"
            value={CURRENCY_FORMATTER.format(costs.notaryPlusLand)}
          />
          <PreviewMetric
            label="Total Additional"
            value={CURRENCY_FORMATTER.format(costs.totalAdditional)}
          />
        </div>
      )}

      <Button className="w-full gap-2" variant="outline" asChild>
        <Link
          to="/tools/property-cost-calculator"
          search={{
            propertyPrice: price || undefined,
            state,
            includeAgent: true,
          }}
        >
          See Detailed Result
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PurchaseCostPreview }
