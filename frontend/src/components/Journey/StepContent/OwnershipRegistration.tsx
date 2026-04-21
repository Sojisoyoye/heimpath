/**
 * Ownership Registration Step Content
 * Guidance for completing the Grundbuch transfer, handover, and utility setup
 */

import { BookOpen, ClipboardList, Home, KeyRound, Zap } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function OwnershipRegistration(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Grundbuch Transfer"
        description="The land register (Grundbuch) officially records you as the property owner."
        items={[
          {
            icon: BookOpen,
            label: "Confirm with your Notar",
            detail:
              "Your notary handles the Grundbuch application. Ask for a confirmation once the entry is updated — this can take 4-8 weeks.",
          },
          {
            icon: KeyRound,
            label: "Key Handover & Ubergabeprotokoll",
            detail:
              "Document the property condition during handover. Note meter readings, defects, and included fixtures in the protocol.",
          },
        ]}
        tip="Keep your Grundbuchauszug (land registry extract) in a safe place — you'll need it for insurance, tax, and any future sale."
      />
      <GuidanceCard
        title="Registrations & Utilities"
        description="Transfer all services and registrations to your name promptly."
        items={[
          {
            icon: Zap,
            label: "Utility Transfers",
            detail:
              "Contact providers for electricity, gas, water, and internet. Have your meter readings from the handover protocol ready.",
          },
          {
            icon: Home,
            label: "Anmeldung (Address Registration)",
            detail:
              "If you're living in the property, register your new address at the local Burgeramt within 2 weeks of moving in.",
          },
          {
            icon: ClipboardList,
            label: "Mail Forwarding",
            detail:
              "Set up a Nachsendeauftrag via Deutsche Post to redirect mail from your old address (optional but recommended).",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { OwnershipRegistration }
