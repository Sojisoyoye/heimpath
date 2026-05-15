/**
 * Ownership Transfer Step Content
 * Guidance on the final Grundbuch transfer and property handover
 */

import { ClipboardCheck, Home, KeyRound, ScrollText } from "lucide-react"

import type { JourneyStep } from "@/models/journey"
import { GuidanceCard } from "./GuidanceCard"

interface IProps {
  step: JourneyStep
}

/******************************************************************************
                              Components
******************************************************************************/

function OwnershipTransferGuide(_props: Readonly<IProps>) {
  return (
    <div className="space-y-4">
      <GuidanceCard
        title="Grundbuch Ownership Entry"
        description="Legal ownership transfers when you are entered as Eigentümer in the Grundbuch — not at the moment of signing."
        items={[
          {
            icon: ScrollText,
            label: "Auflassung → Eigentumsumschreibung",
            detail:
              "The notary submits the Auflassung (conveyance declaration) once all conditions are met. The Grundbuch office processes this and replaces the priority notice with full ownership. This takes 4–8 weeks.",
          },
          {
            icon: Home,
            label: "Confirm the Entry",
            detail:
              "Ask your notary to provide a copy of the updated Grundbuchauszug once the entry is complete. This is your definitive proof of ownership — keep it permanently.",
          },
        ]}
        tip="Even before the Grundbuch entry, you are the economic owner from the Übergabe (handover) date once full payment is confirmed. Insurance and running costs shift to you from that date."
      />
      <GuidanceCard
        title="Property Handover (Übergabe)"
        description="Document the handover carefully to protect yourself from disputes over pre-existing defects."
        items={[
          {
            icon: KeyRound,
            label: "Key Handover and Meter Readings",
            detail:
              "Collect all keys and codes. Record gas, electricity, water, and heat meter readings in the Übergabeprotokoll. Both buyer and seller should sign the protocol.",
          },
          {
            icon: ClipboardCheck,
            label: "Document Defects",
            detail:
              "Note any defects visible during handover in the protocol. Defects discovered after signing that are not in the protocol are harder to claim against the seller once ownership transfers.",
          },
        ]}
      />
    </div>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { OwnershipTransferGuide }
