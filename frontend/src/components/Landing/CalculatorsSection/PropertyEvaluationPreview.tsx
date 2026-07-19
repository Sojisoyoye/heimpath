/**
 * Property Evaluation mini-preview
 * Unlike the other two tabs, this collects a couple of basics only — no
 * inline result. The full evaluation (and its account-gated detail) lives
 * on the destination page, not here.
 */

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useState } from "react"
import { GERMAN_STATES } from "@/common/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Property Evaluation tab preview — inputs only. */
function PropertyEvaluationPreview() {
  const [propertyPrice, setPropertyPrice] = useState("350000")
  const [state, setState] = useState("BE")

  const price = Number.parseFloat(propertyPrice) || 0

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter a few basics — see your full evaluation on the next screen.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="pe-price"
            className="font-mono text-xs text-muted-foreground"
          >
            Property Price
          </Label>
          <Input
            id="pe-price"
            inputMode="numeric"
            value={propertyPrice}
            onChange={(e) =>
              setPropertyPrice(e.target.value.replace(/[^\d]/g, ""))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="pe-state"
            className="font-mono text-xs text-muted-foreground"
          >
            State
          </Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger id="pe-state" className="w-full">
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

      <Button className="w-full gap-2" asChild>
        <Link
          to="/tools/roi-calculator"
          search={{ purchasePrice: price || undefined, state }}
        >
          See My Evaluation
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { PropertyEvaluationPreview }
