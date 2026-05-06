/**
 * Rental Move-In Guide Step Content
 * Guidance on Ubergabeprotokoll, Anmeldung, utilities, and GEZ
 */

import { ClipboardCheck, Home, MapPin, Zap } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function RentalMoveInGuide(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Moving In Checklist"
        description="Complete these essential steps to settle into your new apartment and meet all legal obligations."
        items={[
          {
            icon: ClipboardCheck,
            label: "Ubergabeprotokoll (Handover Protocol)",
            detail:
              "Walk through every room with the landlord. Document all existing defects with photos and written notes. Record meter readings for electricity, gas, and water. Both parties must sign.",
          },
          {
            icon: MapPin,
            label: "Anmeldung (Address Registration)",
            detail:
              "Register your new address at the Burgeramt within 14 days. You'll need the Wohnungsgeberbestatigung (landlord confirmation form) and your ID. Book an appointment online — walk-ins have long waits.",
          },
          {
            icon: Zap,
            label: "Utilities & Internet",
            detail:
              "Set up electricity and gas contracts (compare at Check24.de or Verivox.de). Arrange internet installation — book early as it can take 2-4 weeks. Default utility providers are often more expensive.",
          },
          {
            icon: Home,
            label: "GEZ (Rundfunkbeitrag)",
            detail:
              "Register at rundfunkbeitrag.de — 18.36 EUR/month per household, regardless of whether you own a TV or radio. This is mandatory for every household in Germany.",
          },
        ]}
        tip="The Ubergabeprotokoll protects you from being charged for pre-existing damage when you move out. Be thorough — photograph everything, including walls, floors, and appliances."
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { RentalMoveInGuide }
