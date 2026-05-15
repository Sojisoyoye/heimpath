/**
 * Buying Costs Guide Step Content
 * Overview of German property purchase costs and budgeting guidance
 */

import { Euro, PiggyBank, Receipt, Scale } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function BuyingCostsGuide(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Purchase Cost Breakdown"
        description="German property purchases carry significant mandatory costs on top of the asking price."
        items={[
          {
            icon: Receipt,
            label: "Grunderwerbsteuer (Transfer Tax)",
            detail:
              "Ranges from 3.5% to 6.5% of the purchase price depending on the federal state (Bundesland). Payable within 4 weeks of the Grundbucheintrag.",
          },
          {
            icon: Scale,
            label: "Notar und Grundbuch (Notary & Registry)",
            detail:
              "Typically 1.5–2% of the purchase price. Covers notary fees for the Kaufvertrag and the Grundbuch entry registration.",
          },
          {
            icon: Euro,
            label: "Maklerprovision (Agent Commission)",
            detail:
              "If a buyer's agent is involved, commission is now legally split between buyer and seller (max 3.57% each incl. VAT since 2020).",
          },
        ]}
        tip="Budget 7–12% of the purchase price for total Kaufnebenkosten (ancillary purchase costs) in addition to the property price."
      />
      <GuidanceCard
        title="Plan Your Full Budget"
        description="Account for all costs before committing to a purchase."
        items={[
          {
            icon: PiggyBank,
            label: "Equity Requirement",
            detail:
              "German banks typically require 20–30% equity. The Kaufnebenkosten must usually be covered entirely from equity — they cannot be financed.",
          },
        ]}
        ctaLabel="Open Cost Calculator"
        ctaHref="/calculators/buying-costs"
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { BuyingCostsGuide }
